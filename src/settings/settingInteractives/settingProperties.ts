import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, FOLDER_KEY, INVALID_KEYS, isPropertyKeyValid, LINK_KEY, PluginInstances, PropertyModal, SettingInteractives, SettingsSectionCollapsible, TAG_KEY, UIElements } from "src/internal";
import STRINGS from "src/Strings";

export class SettingPropertiesArray extends SettingsSectionCollapsible {
    settingInteractives: SettingInteractives[] = [];
    interactiveName: string;
    propertiesContainer: HTMLElement;

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'properties', '', STRINGS.features.interactives.properties, 'archive', STRINGS.features.interactives.propertiesDesc);
        
        for (const [key, enabled] of Object.entries(PluginInstances.settings.additionalProperties)) {
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
            });
            this.settingHeader.controlEl.insertAdjacentElement("afterbegin", cb.buttonEl);
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
        const modal = new PropertyModal(
            "Property key",
            this.addProperty.bind(this)
        );
        modal.open();
    }

    isKeyValid(key: string) {
        if (PluginInstances.settings.additionalProperties.hasOwnProperty(key)) {
            new Notice(STRINGS.features.interactives.propertyAlreadyExists);
            return false;
        }
        else if (key === LINK_KEY) {
            new Notice(STRINGS.features.interactives.propertyReservedLinks);
            return false;
        }
        else if (key === FOLDER_KEY) {
            new Notice(STRINGS.features.interactives.propertyReservedFolders);
            return false;
        }
        else if (key === TAG_KEY) {
            new Notice(STRINGS.features.interactives.propertyReservedTags);
            return false;
        }
        return isPropertyKeyValid(key);
    }

    protected addProperty(key: string): boolean {
        if (!this.isKeyValid(key)) return false;

        PluginInstances.settings.additionalProperties[key] = true;
        PluginInstances.settings.interactiveSettings[key] = {
            colormap: "rainbow",
            colors: [],
            unselected: [],
            noneType: "none",
            showOnGraph: true,
            enableByDefault: true,
        }
        PluginInstances.plugin.saveSettings().then(() => {
            const setting = new SettingProperty(key, this.settingTab, this);
            this.settingInteractives.push(setting);
            setting.containerEl = this.propertiesContainer;
            setting.display();
            //INVALID_KEYS[key] = [PluginInstances.settings.interactiveSettings[key].noneType];
        });
        return true;
    }
}

export class SettingProperty extends SettingInteractives {
    array: SettingPropertiesArray;

    constructor(key: string, settingTab: ExtendedGraphSettingTab, array: SettingPropertiesArray) {
        super(settingTab, 'property-key', key, STRINGS.features.interactives.property + ": " + key, '', STRINGS.features.interactives.propertyDesc + key);
        this.array = array;
    }

    protected override addHeader() {
        super.addHeader();
        this.settingHeader.addExtraButton(cb => {
            UIElements.setupExtraButton(cb, 'delete');
            cb.onClick(() => {
                this.remove();
            });
            this.settingHeader.controlEl.insertAdjacentElement("afterbegin", cb.extraSettingsEl);
        });
        this.settingHeader.settingEl.addClass('setting-property-header');
    }

    protected override addBody(): void {
        super.addBody();
        
        // Show on graph
        this.elementsBody.push(new Setting(this.array.propertiesContainer)
            .setName(STRINGS.features.interactives.arcsAdd)
            .setDesc(STRINGS.features.interactives.arcsAddPropertyDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.interactiveSettings[this.interactiveKey].showOnGraph);
                cb.onChange(value => {
                    PluginInstances.settings.interactiveSettings[this.interactiveKey].showOnGraph = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    remove(): void {
        delete PluginInstances.settings.additionalProperties[this.interactiveKey];
        delete PluginInstances.settings.interactiveSettings[this.interactiveKey];
        this.array.settingInteractives.remove(this);
        PluginInstances.plugin.saveSettings().then(() => {
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