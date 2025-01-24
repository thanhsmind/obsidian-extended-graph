import { ColorComponent, HexString, setIcon, Setting, TextComponent } from "obsidian";
import { cmOptions } from "src/colors/colormaps";
import { ExtendedGraphSettingTab } from "../settingTab";
import { getFileInteractives } from "src/helperFunctions";
import { plot_colormap, randomColor } from "src/colors/colors";
import { INVALID_KEYS } from "src/globalVariables";
import ExtendedGraphPlugin from "src/main";
import { Feature } from "src/types/features";
import { SettingsSectionCollapsible } from "../settingCollapsible";
import { UIElements } from "src/ui/UIElements";
import { GradientPickerModal } from "src/ui/modals/gradientPickerModal";

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
            .setName('None type id')
            .setDesc(`The id which will be given if no ${this.interactiveKey} is found.`)
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
        const setting = new Setting(this.containerEl)
            .setName(`Color palette`)
            .setDesc(`Choose the color palette for the ${this.interactiveKey}s visualizations`);
        setting.controlEl.addClass("color-palette");

        // Canvas
        this.canvasPalette = setting.controlEl.createEl("canvas");
        this.canvasPalette.id = `canvas-palette-${this.interactiveKey}`;
        this.canvasPalette.width = 100;
        this.canvasPalette.height = 20;
        plot_colormap(this.canvasPalette.id, this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].colormap, false);

        // Picker icon
        setting.addExtraButton(cb => {
            cb.setIcon("pipette");
            cb.onClick(() => {
                const modal = new GradientPickerModal(this.settingTab.app, (value: string) => {
                    this.onPaletteChanged(value);
                });
                modal.open();
            });
        });

        // Select
        setting.addDropdown(cb => {
                for (const [group, values] of Object.entries(cmOptions)) {
                    const groupEl = cb.selectEl.createEl("optgroup");
                    groupEl.label = group;
                    for (const value of values) {
                        const option = groupEl.createEl("option");
                        option.value = value;
                        option.text = value;
                    }
                }
                cb.setValue(this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].colormap);
                cb.onChange(async (value) => {
                    this.onPaletteChanged(value);
                });
            });

        // Push to body list
        this.elementsBody.push(setting.settingEl);
    }

    private onPaletteChanged(palette: string) {
        if (palette === "") return;
        plot_colormap(this.canvasPalette.id, palette, false);
        this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].colormap = palette;
        this.settingTab.app.workspace.trigger('extended-graph:settings-colorpalette-changed', this.interactiveKey);
        this.settingTab.plugin.saveSettings();
    }

    protected addSpecificColorHeaderSetting(): void {
        this.settingInteractiveColor = new Setting(this.containerEl)
            .setName(`Specific ${this.interactiveKey} colors`)
            .setDesc(`Choose specific ${this.interactiveKey} colors that will not be affected by the color palette`)
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
            .setName(`${this.interactiveKey}s selection`)
            .setDesc(`Choose which ${this.interactiveKey}s should be considered by the plugin`);
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
        if (!this.isValid(this.type)) return;

        const newType = this.textComponent.getValue().trim();
        const newColor = this.colorComponent.getValue();

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
        const type = this.textComponent.getValue().trim();

        const colors = this.plugin.settings.interactiveSettings[this.key].colors;
        const oldIndex = colors.findIndex(c => c.type === this.type);
        if (oldIndex !== -1) {
            colors.remove(colors[oldIndex]);
        }
        this.plugin.saveSettings();
        this.plugin.app.workspace.trigger(`extended-graph:settings-interactive-color-changed`, this.key, type);

        this.settingEl.remove();
    }
}