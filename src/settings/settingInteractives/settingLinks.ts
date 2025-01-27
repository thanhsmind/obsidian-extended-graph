import { Setting } from "obsidian";
import { getAPI as getDataviewAPI } from "obsidian-dataview";
import { ExtendedGraphSettingTab, graphTypeLabels, INVALID_KEYS, isPropertyKeyValid, LINK_KEY, SettingInteractives } from "src/internal";


export class SettingLinks extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'links', LINK_KEY, "Links", 'link', "Display and filter link types");
    }

    protected override addBody(): void {
        super.addBody();



        const labels = this.containerEl.querySelectorAll(`.settings-selection-container.${this.itemClasses} label`);
        const imageLabel = Array.from(labels).find(l => (l as HTMLLabelElement).innerText === this.settingTab.plugin.settings.imageProperty) as HTMLLabelElement;
        if (imageLabel) {
            const cb = imageLabel.querySelector("input") as HTMLInputElement ;
            this.deselectInteractive(imageLabel, cb);
            imageLabel.parentNode?.removeChild(imageLabel);
        }
        
        // Remove sources
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(`Remove sources`)
            .setDesc(`When disabling a link type, also disable the source nodes`)
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['graph']);
                cb.setValue(this.settingTab.plugin.settings.enableFeatures['graph']['source']);
                cb.onChange(value => {
                    this.settingTab.plugin.settings.enableFeatures['graph']['source'] = value;
                    this.settingTab.plugin.saveSettings();
                })
            })
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['localgraph']);
                cb.setValue(this.settingTab.plugin.settings.enableFeatures['localgraph']['source']);
                cb.onChange(value => {
                    this.settingTab.plugin.settings.enableFeatures['localgraph']['source'] = value;
                    this.settingTab.plugin.saveSettings();
                })
            }).settingEl);

        // Add sources
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(`Remove targets`)
            .setDesc(`When disabling a link type, also disable the source nodes`)
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['graph']);
                cb.setValue(this.settingTab.plugin.settings.enableFeatures['graph']['target']);
                cb.onChange(value => {
                    this.settingTab.plugin.settings.enableFeatures['graph']['target'] = value;
                    this.settingTab.plugin.saveSettings();
                })
            })
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['localgraph']);
                cb.setValue(this.settingTab.plugin.settings.enableFeatures['localgraph']['target']);
                cb.onChange(value => {
                    this.settingTab.plugin.settings.enableFeatures['localgraph']['target'] = value;
                    this.settingTab.plugin.saveSettings();
                })
            }).settingEl);
        
        // Show on graph
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(`Color links`)
            .setDesc(`Add colors to the link rendered in the graph view.`)
            .addToggle(cb => {
                cb.setValue(this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].showOnGraph);
                cb.onChange(value => {
                    this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].showOnGraph = value;
                    this.settingTab.plugin.saveSettings();
                })
            }).settingEl);

        // Curved links
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(`Curved links`)
            .setDesc(`Use curved links instead of straight lines`)
            .addToggle(cb => {
                cb.setValue(this.settingTab.plugin.settings.enableFeatures['graph']['curvedLinks']);
                cb.onChange(value => {
                    this.settingTab.plugin.settings.enableFeatures['graph']['curvedLinks'] = value;
                    this.settingTab.plugin.saveSettings();
                })
            })
            .addToggle(cb => {
                cb.setValue(this.settingTab.plugin.settings.enableFeatures['localgraph']['curvedLinks']);
                cb.onChange(value => {
                    this.settingTab.plugin.settings.enableFeatures['localgraph']['curvedLinks'] = value;
                    this.settingTab.plugin.saveSettings();
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

        const dv = getDataviewAPI();
        if (dv) {
            for (const page of dv.pages()) {
                for (const [key, value] of Object.entries(page)) {
                    if (key === "file" || key === this.settingTab.plugin.settings.imageProperty || INVALID_KEYS[LINK_KEY].includes(key)) continue;
                    if (value === null || value === undefined || value === '') continue;

                    if ((typeof value === "object") && ("path" in value)) {
                        allTypes.add(key);
                    }

                    if (Array.isArray(value)) {
                        for (const link of value) {
                            allTypes.add(key);
                        }
                    }
                }
            }
        }
        else {
            for (const file of this.settingTab.app.vault.getFiles()) {
                const frontmatterLinks = this.settingTab.app.metadataCache.getCache(file.path)?.frontmatterLinks;
                if (!frontmatterLinks) continue;
                const types = frontmatterLinks.map(l => l.key.split('.')[0]).filter(k => k !== this.settingTab.plugin.settings.imageProperty && !INVALID_KEYS[LINK_KEY].includes(k));
                allTypes = new Set<string>([...allTypes, ...types]);
            }
        }
        return [...allTypes].sort();
    }
}