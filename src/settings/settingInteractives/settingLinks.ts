import { ButtonComponent, Setting } from "obsidian";
import { getAPI as getDataviewAPI } from "obsidian-dataview";
import { canonicalizeVarName, ExcludeFoldersModal, ExtendedGraphSettingTab, graphTypeLabels, INVALID_KEYS, isPropertyKeyValid, LINK_KEY, PluginInstances, SettingInteractives } from "src/internal";
import STRINGS from "src/Strings";


export class SettingLinks extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'links', LINK_KEY, STRINGS.features.interactives.links, 'link', STRINGS.features.interactives.linksDesc);
    }

    protected override addBody(): void {
        super.addBody();

        this.addExcludeFolders();
        this.addDisableSources();
        this.addDisableTargets();
        this.addShowOnGraph();
        this.addCurvedLinks();
    }

    private addExcludeFolders() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.excludeSourceFolders)
            .setDesc(STRINGS.features.excludeSourceFoldersDesc)
            .addButton(cb => {
                this.setManageNumber(cb, PluginInstances.settings.excludedSourcesFolder.length);
                cb.onClick(() => {
                    const modal = new ExcludeFoldersModal(PluginInstances.settings.excludedSourcesFolder);
                    modal.open();
                    modal.onClose = () => this.setManageNumber(cb, PluginInstances.settings.excludedSourcesFolder.length);
                });
            }).settingEl);

        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.excludeTargetFolders)
            .setDesc(STRINGS.features.excludeTargetFoldersDesc)
            .addButton(cb => {
                this.setManageNumber(cb, PluginInstances.settings.excludedTargetsFolder.length);
                cb.onClick(() => {
                    const modal = new ExcludeFoldersModal(PluginInstances.settings.excludedTargetsFolder);
                    modal.open();
                    modal.onClose = () => this.setManageNumber(cb, PluginInstances.settings.excludedTargetsFolder.length);
                });
            }).settingEl);
    }

    private setManageNumber(cb: ButtonComponent, n: number): void {
        cb.setButtonText(`${STRINGS.controls.manage} (${n})`);
    }

    private addDisableSources() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.removeSources)
            .setDesc(STRINGS.features.removeSourcesDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.disableSource);
                cb.onChange(value => {
                    PluginInstances.settings.disableSource = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addDisableTargets() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.removeTargets)
            .setDesc(STRINGS.features.removeTargetsDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.disableTarget);
                cb.onChange(value => {
                    PluginInstances.settings.disableTarget = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addShowOnGraph() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.interactives.colorLinks)
            .setDesc(STRINGS.features.interactives.colorLinksDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.interactiveSettings[this.interactiveKey].showOnGraph);
                cb.onChange(value => {
                    PluginInstances.settings.interactiveSettings[this.interactiveKey].showOnGraph = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addCurvedLinks() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.interactives.curvedLinks)
            .setDesc(STRINGS.features.interactives.curvedLinksDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.curvedLinks);
                cb.onChange(value => {
                    PluginInstances.settings.curvedLinks = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    protected override isValueValid(name: string): boolean {
        return isPropertyKeyValid(name);
    }

    protected override getPlaceholder(): string {
        return "property-key";
    }

    protected override getAllTypes(): string[] {
        let allTypes = new Set<string>();

        const dv = getDataviewAPI(PluginInstances.app);
        if (dv) {
            for (const page of dv.pages()) {
                for (const [key, value] of Object.entries(page)) {
                    if (key === "file" || key === PluginInstances.settings.imageProperty || INVALID_KEYS[LINK_KEY].includes(key)) continue;
                    if (value === null || value === undefined || value === '') continue;

                    if ((typeof value === "object") && ("path" in value)) {
                        allTypes.add(canonicalizeVarName(key));
                    }

                    if (Array.isArray(value)) {
                        for (const link of value) {
                            if ((typeof link === "object") && ("path" in link)) {
                                allTypes.add(canonicalizeVarName(key));
                            }
                        }
                    }
                }
            }

        }
        else {
            for (const file of this.settingTab.app.vault.getFiles()) {
                const frontmatterLinks = this.settingTab.app.metadataCache.getCache(file.path)?.frontmatterLinks;
                if (!frontmatterLinks) continue;
                const types = frontmatterLinks.map(l => l.key.split('.')[0]).filter(k => k !== PluginInstances.settings.imageProperty && !INVALID_KEYS[LINK_KEY].includes(k));
                allTypes = new Set<string>([...allTypes, ...types]);
            }
        }
        return [...allTypes].sort();
    }
}