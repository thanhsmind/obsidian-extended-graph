import { ColorComponent, HexString, setIcon, Setting, TextComponent } from "obsidian";
import * as Color from 'color-bits';
import {
    ExtendedGraphSettingTab,
    Feature,
    FOLDER_KEY,
    getCMapData,
    getFileInteractives,
    hex2int,
    int2hex,
    InteractivesColorSuggester,
    InteractivesSelectionModal,
    LINK_KEY,
    PluginInstances,
    randomColor,
    SettingColorPalette,
    SettingsSectionPerGraphType,
    TAG_KEY,
    UIElements
} from "src/internal";
import ExtendedGraphPlugin from "src/main";
import STRINGS from "src/Strings";

export abstract class SettingInteractives extends SettingsSectionPerGraphType {
    noneType: string = "";

    settingInteractiveColor: Setting;
    settingInteractiveFilter: Setting;
    selectionContainer: HTMLElement;
    settingColorPalette: SettingColorPalette;
    colors: SettingColor[] = [];

    constructor(settingTab: ExtendedGraphSettingTab, feature: Feature, interactiveKey: string, title: string, icon: string, description: string) {
        super(settingTab, feature, interactiveKey, title, icon, description);
    }

    protected override addBody(): void {
        this.colors = [];
        this.addNoneTypeSetting();
        this.addColorPaletteSetting();
        this.addSpecificColorHeaderSetting();
        PluginInstances.settings.interactiveSettings[this.interactiveKey].colors.forEach((interactive) => {
            this.addColor(interactive.type, interactive.color);
        })
        this.addFilterTypeSetting();
    }

    protected addNoneTypeSetting() {
        this.noneType = PluginInstances.settings.interactiveSettings[this.interactiveKey].noneType;
        const setting = new Setting(this.containerEl)
            .setName(STRINGS.features.interactives.noneTypeID)
            .setDesc(STRINGS.features.interactives.noneTypeIDDesc + this.interactiveKey)
            .addText(cb => cb
                .setValue(PluginInstances.settings.interactiveSettings[this.interactiveKey].noneType)
                .onChange(async (value) => {
                    value = value.trim();
                    if (value == this.noneType) return;
                    PluginInstances.settings.interactiveSettings[this.interactiveKey].noneType = value;
                    //INVALID_KEYS[this.interactiveKey].remove(this.noneType);
                    //INVALID_KEYS[this.interactiveKey].push(value);
                    this.noneType = value;
                    await PluginInstances.plugin.saveSettings();
                }));
        this.elementsBody.push(setting.settingEl);
    }

    protected addColorPaletteSetting(): void {
        this.settingColorPalette = new SettingColorPalette(this.containerEl, this.settingTab, this.interactiveKey)
            .setDesc(STRINGS.features.interactives.paletteDesc + this.interactiveKey);

        this.settingColorPalette.setValue(PluginInstances.settings.interactiveSettings[this.interactiveKey].colormap);

        this.settingColorPalette.onPaletteChange((palette: string) => {
            const oldName = PluginInstances.settings.interactiveSettings[this.interactiveKey].colormap;
            PluginInstances.settings.interactiveSettings[this.interactiveKey].colormap = palette;
            PluginInstances.plugin.app.workspace.trigger('extended-graph:settings-colorpalette-changed', this.interactiveKey);
            PluginInstances.plugin.saveSettings();
            this.settingTab.onCustomPaletteModified(oldName, palette);
        });

        // Push to body list
        this.elementsBody.push(this.settingColorPalette.settingEl);
    }

    protected addSpecificColorHeaderSetting(): void {
        this.settingInteractiveColor = new Setting(this.containerEl)
            .setName(STRINGS.features.interactives.specificColors)
            .setDesc(STRINGS.features.interactives.specificColorsDesc)
            .addButton(cb => {
                UIElements.setupButton(cb, 'add');
                cb.onClick((e) => {
                    this.addColor("", int2hex(randomColor()));
                })
            });
        this.elementsBody.push(this.settingInteractiveColor.settingEl);
    }

    protected addFilterTypeSetting(): void {
        this.settingInteractiveFilter = new Setting(this.containerEl)
            .setName(STRINGS.features.interactives.selection)
            .setDesc(STRINGS.features.interactives.selectionDesc)
            .addExtraButton(cb => {
                cb.setIcon('mouse-pointer-click');
                cb.onClick(() => {
                    const modal = new InteractivesSelectionModal(this.interactiveKey, this.getAllTypes());
                    modal.open();
                })
            });
        this.elementsBody.push(this.settingInteractiveFilter.settingEl);
    }

    protected getAllTypes(): string[] {
        let allTypes = new Set<string>();
        const files = PluginInstances.app.vault.getFiles();
        for (const file of files) {
            allTypes = new Set<string>([...allTypes, ...getFileInteractives(this.interactiveKey, file)]);
        }
        return [...allTypes].sort();
    }

    protected addColor(type: string, color: HexString): void {
        const setting = new SettingColor(this.containerEl, PluginInstances.plugin, this.interactiveKey, type, color, this.isValueValid.bind(this));
        this.elementsBody.push(setting.settingEl);

        this.colors = this.colors.filter(setting => setting.settingEl.parentElement);
        let previous = this.colors.last() ?? this.settingInteractiveColor;
        this.containerEl.insertAfter(setting.settingEl, previous.settingEl);
        this.colors.push(setting);
    }

    onCustomPaletteModified(oldName: string, newName: string): void {
        // Check if the colormap is no longer in the settings
        if (!getCMapData(PluginInstances.settings.interactiveSettings[this.interactiveKey].colormap, PluginInstances.settings)) {
            // If the old name matches AND the new name is valid, change the name
            if (PluginInstances.settings.interactiveSettings[this.interactiveKey].colormap === oldName && getCMapData(newName, PluginInstances.settings)) {
                PluginInstances.settings.interactiveSettings[this.interactiveKey].colormap = newName;
            }
            // Otherwise, reset it
            else {
                PluginInstances.settings.interactiveSettings[this.interactiveKey].colormap = "rainbow";
            }
        }
        this.settingColorPalette.populateCustomOptions();
        this.settingColorPalette.setValue(PluginInstances.settings.interactiveSettings[this.interactiveKey].colormap);
    }

    protected abstract isValueValid(name: string): boolean;
    protected abstract getPlaceholder(): string;
}


class SettingColor extends Setting {
    plugin: ExtendedGraphPlugin;

    isValid: (type: string) => boolean;
    key: string;
    type: string;
    color: HexString;

    textComponent: TextComponent;
    colorComponent: ColorComponent;

    constructor(containerEl: HTMLElement, plugin: ExtendedGraphPlugin, key: string, type: string, color: HexString, isValid: (type: string) => boolean) {
        super(containerEl);

        this.plugin = plugin;
        this.isValid = isValid;
        this.key = key;
        this.type = type;
        this.color = color;

        this.addSearch(cb => {
            this.textComponent = cb;
            const suggester = new InteractivesColorSuggester(cb.inputEl, (value) => {
                cb.setValue(value);
                this.save()
            });
            switch (key) {
                case LINK_KEY:
                    suggester.setKey('link');
                    break;
                case TAG_KEY:
                    suggester.setKey('tag');
                    break;
                case FOLDER_KEY:
                    suggester.setKey('folder');
                    break;
                default:
                    suggester.setKey('property', key);
                    break;
            }
            cb.setPlaceholder(key);
            cb.setValue(type);
            cb.onChange((name: string) => {
                this.save();
            })
        });

        this.addColorPicker(cb => {
            this.colorComponent = cb;
            cb.setValue(color);
            cb.onChange((hex: string) => {
                this.updateCSS();
                this.save();
            })
        });

        this.addButton(cb => {
            setIcon(cb.buttonEl, 'x');
            cb.onClick((() => {
                this.remove();
            }))
        });

        this.updateCSS();
        this.settingEl.addClass('setting-color');
    }

    private save() {
        const newType = this.textComponent.getValue().trim();
        const newColor = this.colorComponent.getValue();

        if (!this.isValid(newType)) return;

        const colors = PluginInstances.settings.interactiveSettings[this.key].colors;

        // Remove old data
        const oldIndex = colors.findIndex(c => c.type === this.type);
        if (oldIndex !== -1) {
            colors.remove(colors[oldIndex]);
        }

        // Add new data
        const newIndex = colors.findIndex(c => c.type === newType);

        if (newIndex === -1) {
            colors.push({ type: newType, color: newColor });
        }
        else {
            colors[newIndex] = { type: newType, color: newColor };
        }

        this.plugin.saveSettings();
        if (this.type !== newType) {
            this.plugin.app.workspace.trigger(`extended-graph:settings-interactive-color-changed`, this.key, this.type);
        }
        this.plugin.app.workspace.trigger(`extended-graph:settings-interactive-color-changed`, this.key, newType);

        this.type = newType;
        this.color = newColor;
    }

    private updateCSS() {
        this.settingEl.style.setProperty("--interactive-color", this.colorComponent.getValue());
    }

    protected remove() {
        const colors = PluginInstances.settings.interactiveSettings[this.key].colors;
        const oldIndex = colors.findIndex(c => c.type === this.type);
        if (oldIndex !== -1) {
            colors.remove(colors[oldIndex]);
        }
        PluginInstances.plugin.saveSettings();
        PluginInstances.app.workspace.trigger(`extended-graph:settings-interactive-color-changed`, this.key, this.type);

        this.settingEl.remove();
    }
}