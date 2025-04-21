import { ColorComponent, HexString, setIcon, Setting, TextComponent } from "obsidian";
import {
    ExtendedGraphSettingTab,
    Feature,
    FOLDER_KEY,
    getFileInteractives,
    InteractivesColorSuggester,
    InteractivesSelectionModal,
    LINK_KEY,
    PluginInstances,
    randomColor,
    SettingColorPalette,
    SettingsSectionCollapsible,
    TAG_KEY,
    UIElements
} from "src/internal";
import ExtendedGraphPlugin from "src/main";
import STRINGS from "src/Strings";

export abstract class SettingInteractives extends SettingsSectionCollapsible {
    noneType: string = "";

    settingInteractiveColor: Setting;
    settingInteractiveFilter: Setting;
    selectionContainer: HTMLElement;
    canvasPalette: HTMLCanvasElement;
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
        const setting = new SettingColorPalette(this.containerEl, this.interactiveKey)
            .setDesc(STRINGS.features.interactives.paletteDesc + this.interactiveKey);

        setting.setValue(PluginInstances.settings.interactiveSettings[this.interactiveKey].colormap);

        setting.onPaletteChange((palette: string) => {
            PluginInstances.settings.interactiveSettings[this.interactiveKey].colormap = palette;
            PluginInstances.plugin.app.workspace.trigger('extended-graph:settings-colorpalette-changed', this.interactiveKey);
            PluginInstances.plugin.saveSettings();
        });

        // Push to body list
        this.elementsBody.push(setting.settingEl);
    }

    protected addSpecificColorHeaderSetting(): void {
        this.settingInteractiveColor = new Setting(this.containerEl)
            .setName(STRINGS.features.interactives.specificColors)
            .setDesc(STRINGS.features.interactives.specificColorsDesc)
            .addButton(cb => {
                UIElements.setupButton(cb, 'add');
                cb.onClick((e) => {
                    this.addColor("", randomColor());
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

    protected abstract isValueValid(name: string): boolean;
    protected abstract getPlaceholder(): string;
}


class SettingColor extends Setting {
    plugin: ExtendedGraphPlugin;

    isValid: (type: string) => boolean;
    key: string;
    type: string;
    color: string;

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
            cb.onChange((color: string) => {
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