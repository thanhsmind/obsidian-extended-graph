import { ButtonComponent, setIcon, Setting, TextComponent, TFile } from "obsidian";
import { getAPI as getDataviewAPI } from "obsidian-dataview";
import { ExtendedGraphSettingTab, LayersManager, PluginInstances, SettingsSectionPerGraphType, SettingMultiPropertiesModal, t, UIElements } from "src/internal";

export class SettingLayers extends SettingsSectionPerGraphType {
    layerInfoSettings: LayerSetting[] = [];
    lastSettingBeforeLayerInfos: Setting;

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'layers', '', `${t("features.layers")} (${t("beta.beta")})`, 'layers', t("features.layersDesc"));
    }

    protected override addBody() {
        this.addProperties();
        this.addNumberOfActiveLayers();
        this.addLayerOrder();
        this.addRemoveNodesWithoutLayer();
        this.addUseCustomOpacity();
        this.addLayersInfo();
        this.addDisplayLabelsInUI();
    }

    private addProperties() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.layerProperties"))
            .setDesc(t("features.layerPropertiesDesc"))
            .addExtraButton(cb => {
                cb.setIcon('mouse-pointer-click');
                cb.onClick(() => {
                    const modal = new SettingMultiPropertiesModal(
                        t("features.layerProperties"),
                        t("features.layerPropertiesAdd"),
                        PluginInstances.settings.layerProperties
                    );
                    modal.open();
                })
            }
            ).settingEl);
    }

    private addNumberOfActiveLayers() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.layersNumber"))
            .setDesc(t("features.layersNumberDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(PluginInstances.settings.numberOfActiveLayers.toString())
                    .onChange(async (value) => {
                        const intValue = parseInt(value);
                        if (!isNaN(intValue) && intValue > 0) {
                            PluginInstances.settings.numberOfActiveLayers = intValue;
                            await PluginInstances.plugin.saveSettings();
                        }
                    })
            }).settingEl);
    }

    private addLayerOrder() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.layersOrder"))
            .setDesc(t("features.layersOrderDesc"))
            .addDropdown(cb => {
                cb.addOptions({
                    "ASC": "0-9",
                    "DESC": "9-0"
                }).setValue(PluginInstances.settings.layersOrder)
                    .onChange(async (value) => {
                        if (value === "ASC" || value === "DESC") {
                            PluginInstances.settings.layersOrder = value;
                            await PluginInstances.plugin.saveSettings();
                        }
                    })
            }).settingEl);
    }

    private addRemoveNodesWithoutLayer() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.layersRemoveIfNoLayer"))
            .setDesc(t("features.layersRemoveIfNoLayerDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.removeNodesWithoutLayers)
                    .onChange(async (value) => {
                        PluginInstances.settings.removeNodesWithoutLayers = value;
                        await PluginInstances.plugin.saveSettings();
                    })
            }).settingEl);
    }

    private addUseCustomOpacity() {
        const setting = new Setting(this.containerEl)
            .setName(t("features.layersUseCustomOpacity"))
            .setDesc(t("features.layersUseCustomOpacityDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.useLayerCustomOpacity)
                    .onChange(async (value) => {
                        PluginInstances.settings.useLayerCustomOpacity = value;
                        await PluginInstances.plugin.saveSettings();
                    })
            });
        this.elementsBody.push(setting.settingEl);
        this.lastSettingBeforeLayerInfos = setting;
    }

    private addLayersInfo() {
        const layers = LayersManager.getAllLayers(PluginInstances.settings);
        this.addLayersInfoFromData(layers);

        if (getDataviewAPI(PluginInstances.app)) {
            const setting = new Setting(this.containerEl)
                .setClass("setting-warning")
                .setDesc(t("features.layersInfoDataview"))
                .then(cb => {
                    setIcon(cb.nameEl, 'triangle-alert');
                });
            this.elementsBody.push(setting.settingEl);
        }
    }

    private addLayersInfoFromData(layers: {
        level: number;
        labels: string[];
    }[]) {
        for (const setting of this.layerInfoSettings) {
            setting.settingEl.detach();
        }
        this.layerInfoSettings = [];

        for (const layer of layers.reverse()) {
            const setting = new LayerSetting(this.settingTab.containerEl, this, layer);

            this.lastSettingBeforeLayerInfos.settingEl.insertAdjacentElement("afterend", setting.settingEl);
            this.layerInfoSettings.push(setting);
            this.elementsBody.push(setting.settingEl);
        }

        this.layerInfoSettings.reverse();
    }

    private addDisplayLabelsInUI() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.layersDisplayLabels"))
            .setDesc(t("features.layersDisplayLabelsDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.displayLabelsInUI)
                    .onChange(async (value) => {
                        PluginInstances.settings.displayLabelsInUI = value;
                        await PluginInstances.plugin.saveSettings();
                    })
            }).settingEl);
    }

    // =========================================================================

    async updateLayerID(oldLevel: number, newLevel: number, labels: { old: string, new: string }[]) {
        // If there is already a custom opacity for this new level, we don't do anything.
        // But if there isn't, we copy the custom opacity of the old level
        if (oldLevel in PluginInstances.settings.layersCustomOpacity && !(newLevel in PluginInstances.settings.layersCustomOpacity)) {
            PluginInstances.settings.layersCustomOpacity[newLevel] = PluginInstances.settings.layersCustomOpacity[oldLevel];
            await PluginInstances.plugin.saveSettings();
        }

        if (isNaN(newLevel)) {
            newLevel = oldLevel;
        }

        const newData: {
            level: number;
            labels: string[];
        }[] = [];

        // If a file has been modified, we need to wait for the file to be cached before we can update the layers
        const cachedState: { [filepath: string]: boolean } = {};

        // When a file is cached, we check if it should be processed and if so, we add it to the newData
        const onFileCached = (file: TFile) => {
            if (file.path in cachedState) {
                // We collect the data right here to avoid the need of a second loop
                LayersManager.addLayerIfNeeded(PluginInstances.settings, newData, file);
                cachedState[file.path] = true;
            }
        }

        const onFileCahedDataview = (type: string, file: TFile, oldPath?: string) => {
            if (type === "update" && file.path in cachedState) {
                // We collect the data right here to avoid the need of a second loop
                LayersManager.addLayerIfNeeded(PluginInstances.settings, newData, file);
                cachedState[file.path] = true;
            }
        }

        // We need to iterate over all the files and wait for all of them to be processed
        let doneIterating: boolean = false;

        const tryFinish = () => {
            // If all files have been processed, we can update the layers
            if (doneIterating && Object.values(cachedState).every(v => v)) {
                // We remove the listener to avoid further changes
                PluginInstances.app.metadataCache.off("changed", onFileCached);
                PluginInstances.app.metadataCache.off("dataview:metadata-change", onFileCahedDataview);
                // We sort the data according to the settings
                LayersManager.sortData(PluginInstances.settings, newData);
                // And finally, we display again the data
                this.addLayersInfoFromData(newData);
            }
        }

        // We use a Proxy to detect when all changes are done
        new Proxy(cachedState, {
            set(target, p, newValue, receiver) {
                const res = Reflect.set(target, p, newValue, receiver);

                // If all files have been processed, we can update the layers
                tryFinish();

                return res;
            },
        });

        // Start listening to file changes
        if (getDataviewAPI(PluginInstances.app)) {
            // @ts-ignore
            PluginInstances.app.metadataCache.on("dataview:metadata-change", onFileCahedDataview);
        }
        else {
            PluginInstances.app.metadataCache.on("changed", onFileCached);
        }

        // Then, we process all the frontmatters' files
        const files = PluginInstances.app.vault.getMarkdownFiles();
        for (const file of files) {
            let modified = false;

            await PluginInstances.app.fileManager.processFrontMatter(file, (frontmatter) => {

                for (const label of labels) {
                    if (label.new === "") {
                        label.new = label.old;
                    }

                    const oldID = oldLevel.toString() + (label.old !== "" ? ("_" + label.old) : "");
                    const newID = newLevel.toString() + (label.new !== "" ? ("_" + label.new) : "");
                    if (oldID === newID) continue;
                    for (const property of PluginInstances.settings.layerProperties) {
                        // If a layer property exists and is currently equal to the old id, change its value
                        if (property in frontmatter && frontmatter[property] === oldID) {
                            frontmatter[property] = newID;
                            modified = true;
                        }
                    }
                }

                if (modified) {
                    cachedState[file.path] = false;
                }
                else {
                    LayersManager.addLayerIfNeeded(PluginInstances.settings, newData, file);
                }
            });
        }

        doneIterating = true;
        tryFinish();
    }
}

class LayerSetting extends Setting {
    mainSettings: SettingLayers;
    layer: {
        level: number;
        labels: string[];
    }

    saveButton: ButtonComponent;
    levelInput: TextComponent;
    labels: { label: string, cb: TextComponent }[] = [];
    opacityInput: TextComponent;

    constructor(
        containerEl: HTMLElement,
        mainSettings: SettingLayers,
        layer: {
            level: number;
            labels: string[];
        }
    ) {
        super(containerEl)

        this.mainSettings = mainSettings;
        this.layer = layer;

        this.settingEl.addClass("setting-layer-info");

        this.addSaveButton()
            .addLevelInput()
            .addLabelsInputs()
            .addOpacityInput();
    }

    private addSaveButton(): LayerSetting {
        this.addButton(cb => {
            this.saveButton = cb;
            UIElements.setupButton(cb, 'save');
            cb.onClick(() => {
                this.mainSettings.updateLayerID(
                    this.layer.level,
                    parseInt(this.levelInput.getValue()),
                    this.labels.map(l => {
                        return {
                            old: l.label,
                            new: l.cb.getValue()
                        };
                    })
                );
            });
        });
        return this;
    }

    private addLevelInput(): LayerSetting {
        this.addText(cb => {
            this.levelInput = cb;
            cb.inputEl.addClass("number");
            cb.setValue(this.layer.level.toString());
        });
        return this;
    }

    private addLabelsInputs(): LayerSetting {
        const labelsDiv = this.controlEl.createDiv("labels-list");
        for (const label of this.layer.labels.reverse()) {
            if (label === "") {
                continue;
            }
            const cb = new TextComponent(labelsDiv);
            cb.setValue(label);
            if (label === "") {
                cb.setDisabled(true);
            }
            this.labels.push({ label, cb })
        }
        return this;
    }

    private addOpacityInput(): LayerSetting {
        this.addText(cb => {
            cb.inputEl.addClass("number");
            cb.setPlaceholder(t("features.layersOpacityPlaceholder"));
            cb.setValue(PluginInstances.settings.layersCustomOpacity[this.layer.level]?.toString() ?? "");
            cb.onChange(async (value) => {
                const floatValue = parseFloat(value);
                if (!isNaN(floatValue)) {
                    PluginInstances.settings.layersCustomOpacity[this.layer.level] = floatValue;
                    await PluginInstances.plugin.saveSettings();
                }
                else {
                    delete PluginInstances.settings.layersCustomOpacity[this.layer.level];
                    await PluginInstances.plugin.saveSettings();
                }
            });
        });
        return this;
    }
}