import { setIcon, Setting } from "obsidian";
import { ExtendedGraphSettingTab } from "../settingTab";
import { SettingInteractives } from "./settingInteractive";
import { isPropertyKeyValid } from "src/helperFunctions";
import { NewNameModal } from "src/ui/modals/newNameModal";
import { FOLDER_KEY, INVALID_KEYS, LINK_KEY, TAG_KEY } from "src/globalVariables";
import { SettingsSectionCollapsible } from "../settingCollapsible";
import { UIElements } from "src/ui/UIElements";

export class SettingPropertiesArray extends SettingsSectionCollapsible {
    settingInteractives: SettingInteractives[] = [];
    interactiveName: string;
    propertiesContainer: HTMLElement;

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'properties', '', "Properties", 'archive', "Display and filter by property values");
        
        for (const [key, enabled] of Object.entries(this.settingTab.plugin.settings.additionalProperties)) {
            this.settingInteractives.push(new SettingProperty(key, settingTab, this));
        }
    }

    protected override addHeader(): void {
        super.addHeader();

        this.settingHeader.addButton(cb => {
            UIElements.setupButton(cb, 'add');
            this.elementsBody.push(cb.buttonEl);
            cb.onClick((e) => {
                cb.buttonEl.blur();
                this.openModalToAddInteractive();
            })
        });
    }

    protected override addBody() {
        this.propertiesContainer = this.settingTab.containerEl.createDiv("setting-item settings-properties-container");
        this.elementsBody.push(this.propertiesContainer);

        for (const setting of this.settingInteractives) {
            setting.containerEl = this.propertiesContainer;
            setting.display();
        }
    }

    protected openModalToAddInteractive() {
        const modal = new NewNameModal(
            this.settingTab.app,
            "Property key",
            this.addProperty.bind(this)
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

    protected addProperty(key: string): boolean {
        if (!this.isKeyValid(key)) return false;

        this.settingTab.plugin.settings.additionalProperties[key] = true;
        this.settingTab.plugin.settings.interactiveSettings[key] = {
            colormap: "rainbow",
            colors: [],
            unselected: [],
            noneType: "none"
        }
        this.settingTab.plugin.saveSettings().then(() => {
            const setting = new SettingProperty(key, this.settingTab, this);
            this.settingInteractives.push(setting);
            setting.containerEl = this.propertiesContainer;
            setting.display();
            INVALID_KEYS[key] = [this.settingTab.plugin.settings.interactiveSettings[key].noneType];
        });
        return true;
    }
}

export class SettingProperty extends SettingInteractives {
    array: SettingPropertiesArray;

    constructor(key: string, settingTab: ExtendedGraphSettingTab, array: SettingPropertiesArray) {
        super(settingTab, 'property-key', key, "Property: " + key, '', "Display and filter property " + key);
        this.array = array;
    }

    protected override addHeader() {
        super.addHeader();
        this.settingHeader.addExtraButton(cb => {
            UIElements.setupExtraButton(cb, 'delete');
            cb.onClick(() => {
                this.remove();
            })
        });
        this.settingHeader.settingEl.addClass('setting-property-header');
    }

    remove(): void {
        delete this.settingTab.plugin.settings.additionalProperties[this.interactiveKey];
        delete this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey];
        this.array.settingInteractives.remove(this);
        this.settingTab.plugin.saveSettings().then(() => {
            this.settingHeader.settingEl.remove();
            this.elementsBody.forEach(el => el.remove());
        });
    }

    protected override isValueValid(name: string): boolean {
        return (name.length > 0);
    }

    protected override getPlaceholder(): string {
        return "property-key";
    }
}