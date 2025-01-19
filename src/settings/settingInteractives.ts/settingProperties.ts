import { setIcon, Setting } from "obsidian";
import { ExtendedGraphSettingTab, SettingsSection } from "../settingTab";
import { SettingInteractives } from "./settingInteractive";
import { isPropertyKeyValid } from "src/helperFunctions";
import { NewNameModal } from "src/ui/newNameModal";
import { FOLDER_KEY, INVALID_KEYS, LINK_KEY, TAG_KEY } from "src/globalVariables";
import { addHeading } from "../settingHelperFunctions";

export class SettingPropertiesArray implements SettingsSection {
    settingTab: ExtendedGraphSettingTab;
    settingInteractives: SettingInteractives[] = [];
    allTopElements: HTMLElement[] = [];
    interactiveName: string;
    propertiesContainer: HTMLDivElement;
    icon: string = "archive";

    constructor(settingTab: ExtendedGraphSettingTab) {
        this.settingTab = settingTab;
        for (const [key, enabled] of Object.entries(this.settingTab.plugin.settings.additionalProperties)) {
            this.settingInteractives.push(new SettingProperties(key, enabled, settingTab, this));
        }
    }

    protected addHeading(): Setting {
        return addHeading({
            containerEl       : this.settingTab.containerEl,
            heading           : 'Properties',
            icon              : this.icon,
            description       : "Display and filter by property values",
            displayCSSVariable: '--display-property-features',
            enable            : this.settingTab.plugin.settings.enableProperties,
            updateToggle      : (function(value: boolean) {
                this.settingTab.plugin.settings.enableProperties = value;
            }).bind(this),
            settingTab        : this.settingTab
        }  ).addButton(cb => {
                this.allTopElements.push(cb.buttonEl);
                setIcon(cb.buttonEl, "plus");
                cb.onClick((e) => {
                    cb.buttonEl.blur();
                    this.openModalToAddInteractive();
                })
            });
    }

    display() {
        const containerEl = this.settingTab.containerEl;
        
        this.addHeading();

        this.allTopElements.forEach(el => {
            el.addClass("extended-graph-setting-property");
        })
        
        
        this.propertiesContainer = containerEl.createDiv("settings-properties-container");
        this.allTopElements.push(this.propertiesContainer);

        for (const setting of this.settingInteractives) {
            setting.containerEl = this.propertiesContainer;
            setting.display();
        }

        this.allTopElements.forEach(el => {
            el.addClass("extended-graph-setting-property");
        })
    }

    protected openModalToAddInteractive() {
        const modal = new NewNameModal(
            this.settingTab.app,
            "Property key",
            this.addInteractive.bind(this)
        );
        modal.open();
    }

    isKeyValid(key: string) {
        if (this.settingTab.plugin.settings.additionalProperties.hasOwnProperty(key)) {
            new Notice("This property already exists");
            return false;
        }
        else if (key === LINK_KEY) {
            new Notice("This property key is reserved for links");
            return false;
        }
        else if (key === FOLDER_KEY) {
            new Notice("This property key is reserved for folders");
            return false;
        }
        else if (key === TAG_KEY) {
            new Notice("This property key is reserved for tags");
            return false;
        }
        return isPropertyKeyValid(key);
    }

    protected addInteractive(key: string): boolean {
        if (!this.isKeyValid(key)) return false;

        this.settingTab.plugin.settings.additionalProperties[key] = true;
        this.settingTab.plugin.settings.interactiveSettings[key] = {
            colormap: "rainbow",
            colors: [],
            unselected: [],
            noneType: "none"
        }
        this.settingTab.plugin.saveSettings().then(() => {
            const setting = new SettingProperties(key, true, this.settingTab, this);
            this.settingInteractives.push(setting);
            setting.containerEl = this.propertiesContainer;
            setting.display();
            INVALID_KEYS[key] = [this.settingTab.plugin.settings.interactiveSettings[key].noneType];
        });
        return true;
    }
}

export class SettingProperties extends SettingInteractives {
    enabled: boolean;
    array: SettingPropertiesArray;

    constructor(key: string, enabled: boolean, settingTab: ExtendedGraphSettingTab, array: SettingPropertiesArray) {
        super(settingTab);
        this.interactiveName = key;
        this.elementName = "node";
        this.previewClass = "arc";
        this.enabled = enabled;
        this.array = array;
    }

    protected addHeading(): Setting {
        const heading = addHeading({
            containerEl       : this.containerEl,
            heading           : 'Property: ' + this.interactiveName,
            icon              : '',
            description       : "Display and filter property " + this.interactiveName,
            enable            : this.settingTab.plugin.settings.additionalProperties[this.interactiveName],
            updateToggle      : (function(value: boolean) {
                this.settingTab.plugin.settings.additionalProperties[this.interactiveName] = value;
            }).bind(this),
            settingTab        : this.settingTab
        }  ).addButton(cb => {
                setIcon(cb.buttonEl, "trash");
                cb.onClick((e) => {
                    this.remove();
                    this.settingTab.plugin.saveSettings().then(() => {
                        for (const el of this.allTopElements) {
                            this.containerEl.removeChild(el);
                        }
                    });
                })
            });

        this.allTopElements.push(heading.settingEl);

        return heading;
    }

    remove(): void {
        delete this.settingTab.plugin.settings.additionalProperties[this.interactiveName];
        delete this.settingTab.plugin.settings.interactiveSettings[this.interactiveName];
        this.array.settingInteractives.remove(this);
    }

    display(): void {
        super.display();
    }

    protected saveColor(preview: HTMLDivElement, type: string, color: string) {
        if (this.isValueValid(type)) {
            this.updatePreview(preview, type, color);
            super.saveColors(type);
        }
        else {
            preview.innerText = "";
        }
    }

    protected isValueValid(name: string): boolean {
        return (name.length > 0);
    }

    protected getPlaceholder(): string {
        return "property-key";
    }

    protected updatePreview(preview: HTMLDivElement, type?: string, color?: string) {
        this.updateCSS(preview, color);
    }
}