import { Setting } from "obsidian";
import { getAPI as getDataviewAPI } from "obsidian-dataview";
import { canonicalizeVarName, ExtendedGraphSettingTab, graphTypeLabels, INVALID_KEYS, isPropertyKeyValid, LINK_KEY, PluginInstances, SettingInteractives } from "src/internal";
import STRINGS from "src/Strings";


export class SettingLinks extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'links', LINK_KEY, STRINGS.features.interactives.links, 'link', STRINGS.features.interactives.linksDesc);
    }

    protected override addBody(): void {
        super.addBody();
        
        // Remove sources
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.removeSources)
            .setDesc(STRINGS.features.removeSourcesDesc)
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['graph']);
                cb.setValue(PluginInstances.settings.enableFeatures['graph']['source']);
                cb.onChange(value => {
                    PluginInstances.settings.enableFeatures['graph']['source'] = value;
                    PluginInstances.plugin.saveSettings();
                })
            })
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['localgraph']);
                cb.setValue(PluginInstances.settings.enableFeatures['localgraph']['source']);
                cb.onChange(value => {
                    PluginInstances.settings.enableFeatures['localgraph']['source'] = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);

        // Add sources
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.removeTargets)
            .setDesc(STRINGS.features.removeTargetsDesc)
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['graph']);
                cb.setValue(PluginInstances.settings.enableFeatures['graph']['target']);
                cb.onChange(value => {
                    PluginInstances.settings.enableFeatures['graph']['target'] = value;
                    PluginInstances.plugin.saveSettings();
                })
            })
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['localgraph']);
                cb.setValue(PluginInstances.settings.enableFeatures['localgraph']['target']);
                cb.onChange(value => {
                    PluginInstances.settings.enableFeatures['localgraph']['target'] = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
        
        // Show on graph
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

        // Curved links
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.interactives.curvedLinks)
            .setDesc(STRINGS.features.interactives.curvedLinksDesc)
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['graph']);
                cb.setValue(PluginInstances.settings.enableFeatures['graph']['curvedLinks']);
                cb.onChange(value => {
                    PluginInstances.settings.enableFeatures['graph']['curvedLinks'] = value;
                    PluginInstances.plugin.saveSettings();
                })
            })
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['localgraph']);
                cb.setValue(PluginInstances.settings.enableFeatures['localgraph']['curvedLinks']);
                cb.onChange(value => {
                    PluginInstances.settings.enableFeatures['localgraph']['curvedLinks'] = value;
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