import { Notice, PluginSettingTab, Setting, ToggleComponent } from "obsidian";
import { getAPI as getDataviewAPI } from "obsidian-dataview";
import {
    ExportConfigModal,
    ImportConfigModal,
    PluginInstances,
    SettingFocus,
    SettingFolders,
    SettingImages,
    SettingLinks,
    SettingElementsStats,
    SettingPerformance,
    SettingPropertiesArray,
    SettingShapes,
    SettingsSection,
    SettingTags,
    SettingZoom,
    SettingNames,
    SettingIcons,
    SettingArrows,
    ExtendedGraphSettings,
    SettingQuery,
    SettingAutomation,
    SettingDisplay,
    SettingBeta,
    SettingFilter,
    t,
    SettingInput as SettingInputs,
    SettingLayers
} from "src/internal";
import ExtendedGraphPlugin from "src/main";

export class ExtendedGraphSettingTab extends PluginSettingTab {
    sections: SettingsSection[] = [];
    originalSettings: ExtendedGraphSettings;
    showResetModalToggle: ToggleComponent;

    settingsWithPalettes: { onCustomPaletteModified: (oldName: string, newName: string) => void }[] = [];

    constructor(plugin: ExtendedGraphPlugin) {
        super(PluginInstances.app, plugin);

        // We need to store those ones localy in order to interact with them
        // when a custom color palette is created/edited/deleted
        const settingsTags = new SettingTags(this);
        const settingsProperties = new SettingPropertiesArray(this);
        const settingLinks = new SettingLinks(this);
        const settingFolders = new SettingFolders(this);
        const settingElementsStats = new SettingElementsStats(this);
        const settingDisplay = new SettingDisplay(this);
        this.settingsWithPalettes.push(
            settingsTags,
            settingsProperties,
            settingLinks,
            settingFolders,
            settingElementsStats,
            settingDisplay
        )

        this.sections.push(new SettingAutomation(this));
        this.sections.push(settingsTags);
        this.sections.push(settingsProperties);
        this.sections.push(settingLinks);
        this.sections.push(new SettingArrows(this));
        this.sections.push(settingFolders);
        this.sections.push(new SettingImages(this));
        this.sections.push(new SettingIcons(this));
        this.sections.push(new SettingFocus(this));
        this.sections.push(new SettingShapes(this));
        this.sections.push(new SettingLayers(this));
        this.sections.push(settingElementsStats);
        this.sections.push(new SettingNames(this));
        this.sections.push(new SettingZoom(this));
        this.sections.push(settingDisplay);
        this.sections.push(new SettingFilter(this));
        this.sections.push(new SettingInputs(this));
        this.sections.push(new SettingPerformance(this));
        this.sections.push(new SettingBeta(this));
    }

    override display(): void {
        this.originalSettings = structuredClone(PluginInstances.settings);
        this.containerEl.empty();
        this.containerEl.addClass("extended-graph-settings");

        this.addImportExport();
        this.addNav();
        this.addDisableNodes();
        this.addCanonicalPropertiesWithDataview();

        // FEATURES
        for (const section of this.sections) {
            section.display();
        }
    }

    private addImportExport(): void {
        new Setting(this.containerEl)
            .addExtraButton(cb => {
                cb.extraSettingsEl.insertAdjacentText('beforebegin', t("controls.export"))
                cb.setIcon("upload");
                cb.setTooltip(t("controls.exportSettings"));
                cb.onClick(() => {
                    const modal = new ExportConfigModal((name: string) => {
                        if (name.trim() === "") {
                            return false;
                        }
                        let filepath = PluginInstances.configurationDirectory + "/" + name + ".json";
                        PluginInstances.plugin.exportSettings(filepath);
                        return true;
                    });
                    modal.open();
                });
            })
            .addExtraButton(cb => {
                cb.extraSettingsEl.insertAdjacentText('beforebegin', t("controls.import"))
                cb.setIcon("download");
                cb.setTooltip(t("controls.importSettings"));
                cb.onClick(() => {
                    const modal = new ImportConfigModal((filepath: string) => {
                        if (filepath.trim() === "") {
                            new Notice("Configuration name cannot be empty");
                            return;
                        }
                        PluginInstances.plugin.importSettings(filepath).then(() => {
                            this.display();
                        });
                    });
                    modal.open();
                });
            });
    }

    private addNav(): void {
        const nav = this.containerEl.createDiv({ cls: "extended-graph-nav-settings" });

        const label = nav.createDiv({ cls: "nav-label" });
        label.innerText = t("controls.goTo");
    }

    private addDisableNodes() {
        new Setting(this.containerEl)
            .setName(t("features.disableNodes"))
            .setDesc(t("features.disableNodesDesc"))
            .addToggle(cb => {
                cb.setValue(!PluginInstances.settings.fadeOnDisable);
                cb.onChange(value => {
                    PluginInstances.settings.fadeOnDisable = !value;
                    PluginInstances.plugin.saveSettings();
                })
            });
    }

    private addCanonicalPropertiesWithDataview() {
        if (getDataviewAPI(PluginInstances.app)) {
            new Setting(this.containerEl)
                .setName(t("features.canonicalizePropertiesWithDataview"))
                .setDesc(t("features.canonicalizePropertiesWithDataviewDesc"))
                .addToggle(cb => {
                    cb.setValue(PluginInstances.settings.canonicalizePropertiesWithDataview);
                    cb.onChange(value => {
                        PluginInstances.settings.canonicalizePropertiesWithDataview = value;
                        PluginInstances.plugin.saveSettings();
                    })
                });
        }
    }

    override hide(): void {
        if (PluginInstances.graphsManager && PluginInstances.settings.resetAfterChanges) {
            if (SettingQuery.needReload(this.originalSettings, 'graph')) {
                PluginInstances.graphsManager.resetAllPlugins('graph');
            }
            if (SettingQuery.needReload(this.originalSettings, 'localgraph')) {
                PluginInstances.graphsManager.resetAllPlugins('localgraph');
            }
        }
        super.hide();
    }

    onCustomPaletteModified(oldName: string, newName: string): void {
        for (const setting of this.settingsWithPalettes) {
            setting.onCustomPaletteModified(oldName, newName);
        }
        PluginInstances.plugin.saveSettings();
    }
}