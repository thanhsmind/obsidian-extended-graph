import { INVALID_KEYS, LINK_KEY } from "src/globalVariables";
import { SettingInteractives } from "./settingInteractive";
import { ExtendedGraphSettingTab } from "../settingTab";
import { Setting } from "obsidian";
import { capitalizeFirstLetter, isPropertyKeyValid } from "src/helperFunctions";
import { getAPI as getDataviewAPI } from "obsidian-dataview";
import { addHeading } from "../settingHelperFunctions";


export class SettingLinks extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab);
        this.interactiveName = LINK_KEY;
        this.elementName = "link";
        this.previewClass = "line";
        this.icon = "link";
    }

    protected addHeading(): Setting {
        return addHeading({
            containerEl       : this.settingTab.containerEl,
            heading           : capitalizeFirstLetter(this.interactiveName + 's'),
            icon              : this.icon,
            description       : "Display and filter link types",
            displayCSSVariable: '--display-link-features',
            enable            : this.settingTab.plugin.settings.enableLinks,
            updateToggle      : (function(value: boolean) {
                this.settingTab.plugin.settings.enableLinks = value;
            }).bind(this),
            settingTab        : this.settingTab
        });
    }

    display(): void {
        super.display();

        const labels = this.containerEl.querySelectorAll(`.settings-selection-container.extended-graph-setting-${this.interactiveName} label`);
        const imageLabel = Array.from(labels).find(l => (l as HTMLLabelElement).innerText === this.settingTab.plugin.settings.imageProperty) as HTMLLabelElement;
        if (imageLabel) {
            const cb = imageLabel.querySelector("input") as HTMLInputElement ;
            this.deselectInteractive(imageLabel, cb);
            imageLabel.parentNode?.removeChild(imageLabel);
        }
        
        this.allTopElements.push(new Setting(this.settingTab.containerEl)
            .setName(`Remove sources`)
            .setDesc(`When disabling a link type, also disable the source nodes`)
            .addToggle(cb => {
                cb.setValue(this.settingTab.plugin.settings.removeSource);
                cb.onChange(value => {
                    this.settingTab.plugin.settings.removeSource = value;
                    this.settingTab.plugin.saveSettings();
                })
            }).settingEl);

        this.allTopElements.push(new Setting(this.settingTab.containerEl)
            .setName(`Remove targets`)
            .setDesc(`When disabling a link type, also disable the source nodes`)
            .addToggle(cb => {
                cb.setValue(this.settingTab.plugin.settings.removeTarget);
                cb.onChange(value => {
                    this.settingTab.plugin.settings.removeTarget = value;
                    this.settingTab.plugin.saveSettings();
                })
            }).settingEl);

        this.allTopElements.forEach(el => {
            el.addClass("extended-graph-setting-" + this.interactiveName);
        })
    }

    protected saveColor(preview: HTMLDivElement, type: string, color: string) {
        if (this.isValueValid(type)) {
            this.updatePreview(preview, type, color);
            super.saveColors(type);
        }
    }

    protected isValueValid(name: string): boolean {
        return isPropertyKeyValid(name);
    }

    protected getPlaceholder(): string {
        return "property-key";
    }

    protected updatePreview(preview: HTMLDivElement, type?: string, color?: string) {
        this.updateCSS(preview, color);
    }

    protected getAllTypes(): string[] {
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