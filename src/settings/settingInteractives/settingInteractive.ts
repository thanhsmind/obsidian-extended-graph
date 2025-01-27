import { ColorComponent, HexString, setIcon, Setting, TextComponent } from "obsidian";
import { cmOptions, ExtendedGraphSettingTab, Feature, getFileInteractives, GradientPickerModal, INVALID_KEYS, plot_colormap, randomColor, SettingColorPalette, SettingsSectionCollapsible, UIElements } from "src/internal";
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

    protected addBody(): void {
        this.addNoneTypeSetting();
        this.addColorPaletteSetting();
        this.addSpecificColorHeaderSetting();
        this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].colors.forEach((interactive) => {
            this.addColor(interactive.type, interactive.color);
        })
        this.addFilterTypeSetting();
    }

    protected addNoneTypeSetting() {
        this.noneType = this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].noneType;
        const setting = new Setting(this.containerEl)
            .setName(STRINGS.features.interactives.noneTypeID)
            .setDesc(STRINGS.features.interactives.noneTypeIDDesc + this.interactiveKey)
            .addText(cb => cb
                .setValue(this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].noneType)
                .onChange(async (value) => {
                    value = value.trim();
                    if (value == this.noneType) return;
                    this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].noneType = value;
                    INVALID_KEYS[this.interactiveKey].remove(this.noneType);
                    INVALID_KEYS[this.interactiveKey].push(value);
                    this.noneType = value;
                    await this.settingTab.plugin.saveSettings();
            }));
        this.elementsBody.push(setting.settingEl);
    }

    protected addColorPaletteSetting(): void {
        const setting = new SettingColorPalette(this.containerEl, this.settingTab.plugin.app, this.interactiveKey)
            .setDesc(STRINGS.features.interactives.paletteDesc + this.interactiveKey);

        setting.setValue(this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].colormap);
        
        setting.onPaletteChange((palette: string) => {
            this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].colormap = palette;
            this.settingTab.plugin.app.workspace.trigger('extended-graph:settings-colorpalette-changed', this.interactiveKey);
            this.settingTab.plugin.saveSettings();
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
            .setDesc(STRINGS.features.interactives.selectionDesc);
        this.elementsBody.push(this.settingInteractiveFilter.settingEl);
        
        this.selectionContainer = this.containerEl.createDiv({cls: "setting-item settings-selection-container"});
        this.elementsBody.push(this.selectionContainer);

        const allTypes = this.getAllTypes();
        for (const type of allTypes) {
            const isActive = !this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].unselected.includes(type);
            const label = this.selectionContainer.createEl("label");
            const text = label.createSpan({text: type});
            const toggle = label.createEl("input", {type: "checkbox"});
            isActive ? this.selectInteractive(label, toggle): this.deselectInteractive(label, toggle);
            toggle.addEventListener("change", e => {
                toggle.checked ? this.selectInteractive(label, toggle): this.deselectInteractive(label, toggle);
            })
        }
    }

    protected addColor(type: string, color: HexString): void {
        const setting = new SettingColor(this.containerEl, this.settingTab.plugin, this.interactiveKey, type, color, this.isValueValid.bind(this));
        this.elementsBody.push(setting.settingEl);

        let previous = this.colors.last() ?? this.settingInteractiveColor;
        this.containerEl.insertAfter(setting.settingEl, previous.settingEl);
        this.colors.push(setting);
    }

    protected selectInteractive(label: HTMLLabelElement, toggle: HTMLInputElement) {
        label.addClass("is-active");
        toggle.checked = true;
        if (this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].unselected.includes(label.innerText)) {
            this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].unselected.remove(label.innerText);
            this.settingTab.plugin.saveSettings();
        }
    }

    protected deselectInteractive(label: HTMLLabelElement, toggle: HTMLInputElement) {
        label.removeClass("is-active");
        toggle.checked = false;
        if (!this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].unselected.includes(label.innerText)) {
            this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].unselected.push(label.innerText);
            this.settingTab.plugin.saveSettings();
        }
    }

    protected getAllTypes(): string[] {
        let allTypes = new Set<string>();
        for (const file of this.settingTab.app.vault.getFiles()) {
            allTypes = new Set<string>([...allTypes, ...getFileInteractives(this.interactiveKey, this.settingTab.app, file)]);
        }
        return [...allTypes].sort();
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
        
        this.addText(cb => {
            this.textComponent = cb;
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

        const colors = this.plugin.settings.interactiveSettings[this.key].colors;

        // Remove old data
        const oldIndex = colors.findIndex(c => c.type === this.type);
        if (oldIndex !== -1) {
            colors.remove(colors[oldIndex]);
        }

        // Add new data
        const newIndex = colors.findIndex(c => c.type === newType);

        if (newIndex === -1) {
            colors.push({type: newType, color: newColor});
        }
        else {
            colors[newIndex] = {type: newType, color: newColor};
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
        const colors = this.plugin.settings.interactiveSettings[this.key].colors;
        const oldIndex = colors.findIndex(c => c.type === this.type);
        if (oldIndex !== -1) {
            colors.remove(colors[oldIndex]);
        }
        this.plugin.saveSettings();
        this.plugin.app.workspace.trigger(`extended-graph:settings-interactive-color-changed`, this.key, this.type);

        this.settingEl.remove();
    }
}