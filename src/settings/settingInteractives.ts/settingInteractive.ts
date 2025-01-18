import { ColorComponent, HexString, setIcon, Setting, TextComponent } from "obsidian";
import { cmOptions } from "src/colors/colormaps";
import { ExtendedGraphSettingTab, SettingsSection } from "../settingTab";
import { capitalizeFirstLetter, getFileInteractives } from "src/helperFunctions";
import { plot_colormap, randomColor } from "src/colors/colors";
import { INVALID_KEYS } from "src/globalVariables";

export abstract class SettingInteractives implements SettingsSection {
    settingTab: ExtendedGraphSettingTab;
    interactiveName: string;
    elementName: string;
    previewClass: string;
    noneType: string = "";
    icon: string = "";
    
    containerEl: HTMLElement;
    settingInteractiveColor: Setting;
    colorsContainer: HTMLDivElement;
    settingInteractiveFilter: Setting;
    selectionContainer: HTMLDivElement;
    canvasPalette: HTMLCanvasElement;
    colorItems = new Map<string, Setting>();
    allTopElements: HTMLElement[] = [];

    constructor(settingTab: ExtendedGraphSettingTab) {
        this.settingTab = settingTab;
        this.containerEl = this.settingTab.containerEl;
    }
    
    protected abstract addHeading(): Setting;

    display() {
        this.colorItems.clear();

        this.addHeading();

        // NONE TYPE
        this.allTopElements.push(
            new Setting(this.containerEl)
                .setName('None type id')
                .setDesc(`The id which will be given to ${this.elementName} with no type`)
                .addText(cb => cb
                    .setValue(this.settingTab.plugin.settings.interactiveSettings[this.interactiveName].noneType)
                    .onChange(async (value) => {
                        value = value.trim();
                        if (value == this.noneType) return;
                        this.settingTab.plugin.settings.interactiveSettings[this.interactiveName].noneType = value;
                        INVALID_KEYS[this.interactiveName].remove(this.noneType);
                        INVALID_KEYS[this.interactiveName].push(value);
                        this.noneType = value;
                        await this.settingTab.plugin.saveSettings();
                }))
                .settingEl
        );
        this.noneType = this.settingTab.plugin.settings.interactiveSettings[this.interactiveName].noneType;

        // COLOR PALETTE
        const settingPalette = new Setting(this.containerEl)
            .setName(`Color palette`)
            .setDesc(`Choose the color palette for the ${this.interactiveName}s visualizations`)
            .addDropdown(cb => cb.addOptions(cmOptions).setValue(this.settingTab.plugin.settings.interactiveSettings[this.interactiveName].colormap)
            .onChange(async (value) => {
                plot_colormap(this.canvasPalette.id, value, false);
                this.settingTab.plugin.settings.interactiveSettings[this.interactiveName].colormap = value;
                this.settingTab.app.workspace.trigger('extended-graph:settings-colorpalette-changed', this.interactiveName);
                await this.settingTab.plugin.saveSettings();
            }));
        this.allTopElements.push(settingPalette.settingEl);
        settingPalette.controlEl.addClass("color-palette");
        this.canvasPalette = settingPalette.controlEl.createEl("canvas");
        this.canvasPalette.id = `canvas-palette-${this.interactiveName}`;
        this.canvasPalette.width = 100;
        this.canvasPalette.height = 20;
        plot_colormap(this.canvasPalette.id, this.settingTab.plugin.settings.interactiveSettings[this.interactiveName].colormap, false);
        
        // SPECIFIC COLORS
        this.settingInteractiveColor = new Setting(this.containerEl)
            .setName(`Specific ${this.interactiveName} colors`)
            .setDesc(`Choose specific ${this.interactiveName} colors that will not be affected by the color palette`)
            .addButton(cb => {
                setIcon(cb.buttonEl, "plus");
                cb.onClick((e) => {
                    this.addColor("", randomColor());
                })
            });
        this.allTopElements.push(this.settingInteractiveColor.settingEl);
        
        this.colorsContainer = this.containerEl.createDiv("settings-colors-container");
        this.allTopElements.push(this.colorsContainer);

        this.settingTab.plugin.settings.interactiveSettings[this.interactiveName].colors.forEach((interactive) => {
            this.addColor(interactive.type, interactive.color);
        })

        // FILTER TYPES
        this.settingInteractiveFilter = new Setting(this.containerEl)
            .setName(`${this.interactiveName}s selection`)
            .setDesc(`Choose which ${this.interactiveName}s should be considered by the plugin`);
        this.allTopElements.push(this.settingInteractiveFilter.settingEl);
        
        this.selectionContainer = this.containerEl.createDiv("settings-selection-container");
        this.allTopElements.push(this.selectionContainer);

        const allTypes = this.getAllTypes();
        for (const type of allTypes) {
            const isActive = !this.settingTab.plugin.settings.interactiveSettings[this.interactiveName].unselected.includes(type);
            const label = this.selectionContainer.createEl("label");
            const text = label.createSpan({text: type});
            const toggle = label.createEl("input", {type: "checkbox"});
            isActive ? this.selectInteractive(label, toggle): this.deselectInteractive(label, toggle);
            toggle.addEventListener("change", e => {
                toggle.checked ? this.selectInteractive(label, toggle): this.deselectInteractive(label, toggle);
            })
        }
    }

    protected addColor(type: string, color: HexString): Setting {
        const colorSetting = new Setting(this.colorsContainer);
        const uuid = crypto.randomUUID();
        this.colorItems.set(uuid, colorSetting);
        
        colorSetting.addText(cb => {
            cb.setPlaceholder(this.getPlaceholder());
            cb.setValue(type);
            cb.onChange((name: string) => {
                this.saveColorSetting(uuid);
            })
        });

        colorSetting.addColorPicker(cb => {
            cb.setValue(color);
            cb.onChange((color: string) => {
                this.saveColorSetting(uuid);
            })
        });

        colorSetting.addButton(cb => {
            setIcon(cb.buttonEl, 'x');
            cb.onClick((() => {
                this.removeColorSetting(uuid);
            }))
        });

        const preview = colorSetting.controlEl.createDiv(`preview ${this.previewClass}`);
        this.updatePreview(preview, type, color);

        return colorSetting;
    }

    protected updateCSS(preview: HTMLElement, color?: string) {
        const parent = preview.parentElement;
        color ? parent?.style.setProperty("--interactive-color", color): parent?.style.setProperty("--interactive-color", "transparent");
    }

    protected removeColorSetting(uuid: string) {
        const colorSetting = this.colorItems.get(uuid);
        if (!colorSetting) return;

        const textInput = colorSetting.components.find(cb => cb.hasOwnProperty('inputEl')) as TextComponent;
        const type = textInput.getValue().trim();

        this.colorsContainer.removeChild(colorSetting.settingEl);
        this.colorItems.delete(uuid);
        this.saveColors(type);
    }

    protected saveColorSetting(uuid: string) {
        const colorSetting = this.colorItems.get(uuid);
        if (!colorSetting) return;

        const colorPicker = colorSetting.components.find(cb => cb.hasOwnProperty('colorPickerEl')) as ColorComponent;
        const textInput = colorSetting.components.find(cb => cb.hasOwnProperty('inputEl')) as TextComponent;
        const preview = colorSetting.controlEl.querySelector(".preview") as HTMLElement;
        const type = textInput.getValue().trim();
        const color = colorPicker.getValue();
        this.saveColor(preview, type, color);
    }

    protected selectInteractive(label: HTMLLabelElement, toggle: HTMLInputElement) {
        label.addClass("is-active");
        toggle.checked = true;
        if (this.settingTab.plugin.settings.interactiveSettings[this.interactiveName].unselected.includes(label.innerText)) {
            this.settingTab.plugin.settings.interactiveSettings[this.interactiveName].unselected.remove(label.innerText);
            this.settingTab.plugin.saveSettings();
        }
    }

    protected deselectInteractive(label: HTMLLabelElement, toggle: HTMLInputElement) {
        label.removeClass("is-active");
        toggle.checked = false;
        if (!this.settingTab.plugin.settings.interactiveSettings[this.interactiveName].unselected.includes(label.innerText)) {
            this.settingTab.plugin.settings.interactiveSettings[this.interactiveName].unselected.push(label.innerText);
            this.settingTab.plugin.saveSettings();
        }
    }

    protected async saveColors(changedType: string) {
        this.settingTab.plugin.settings.interactiveSettings[this.interactiveName].colors = [];
        this.colorItems.forEach(colorSetting => {
            const colorPicker = colorSetting.components.find(cb => cb.hasOwnProperty('colorPickerEl')) as ColorComponent;
            const textInput = colorSetting.components.find(cb => cb.hasOwnProperty('inputEl')) as TextComponent;
            const type = textInput.getValue();
            const color = colorPicker.getValue();
            this.settingTab.plugin.settings.interactiveSettings[this.interactiveName].colors.push({type: type, color: color});
        });
        this.settingTab.app.workspace.trigger(`extended-graph:settings-interactive-color-changed`, this.interactiveName, changedType);
        await this.settingTab.plugin.saveSettings();
    }

    protected getAllTypes(): string[] {
        let allTypes = new Set<string>();
        for (const file of this.settingTab.app.vault.getFiles()) {
            allTypes = new Set<string>([...allTypes, ...getFileInteractives(this.interactiveName, this.settingTab.app, file)]);
        }
        return [...allTypes].sort();
    }

    protected abstract saveColor(preview: HTMLElement, type: string, color: string): void;
    protected abstract isValueValid(name: string): boolean;
    protected abstract getPlaceholder(): string;
    protected abstract updatePreview(preview: HTMLDivElement, type?: string, color?: string): void;
}

