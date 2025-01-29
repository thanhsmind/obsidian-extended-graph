import { DropdownComponent, Setting } from "obsidian";
import { cmOptions, GradientPickerModal, plot_colormap, PluginInstances } from "src/internal";
import STRINGS from "src/Strings";

export class SettingColorPalette extends Setting {
    canvasPalette: HTMLCanvasElement;
    dropdown: DropdownComponent;

    private onPaletteChanged: (palette: string) => void

    constructor(containerEl: HTMLElement, key: string) {
        super(containerEl);
        this.setName(STRINGS.features.interactives.palette);
        this.controlEl.addClass("color-palette");
    
        // Canvas
        this.canvasPalette = this.controlEl.createEl("canvas");
        this.canvasPalette.id = `canvas-palette-${key}`;
        this.canvasPalette.width = 100;
        this.canvasPalette.height = 20;
    
        // Picker icon
        this.addExtraButton(cb => {
            cb.setIcon("pipette");
            cb.onClick(() => {
                const modal = new GradientPickerModal();
                modal.onSelected((palette: string) => {
                    if (palette === "") return;
                    plot_colormap(this.canvasPalette.id, palette, false);
                    if (this.onPaletteChanged) this.onPaletteChanged(palette);
                });
                modal.open();
            });
        });
    
        // Select
        this.addDropdown(cb => {
            this.dropdown = cb;
            for (const [group, values] of Object.entries(cmOptions)) {
                const groupEl = cb.selectEl.createEl("optgroup");
                groupEl.label = group;
                for (const value of values) {
                    const option = groupEl.createEl("option");
                    option.value = value;
                    option.text = value;
                }
            }
            cb.onChange(async (palette) => {
                if (palette === "") return;
                plot_colormap(this.canvasPalette.id, palette, false);
                if (this.onPaletteChanged) this.onPaletteChanged(palette);
            });
        });
    }

    setValue(palette: string) {
        plot_colormap(this.canvasPalette.id, palette, false);
        this.dropdown.setValue(palette);
    }

    onPaletteChange(callback: (palette: string) => void) {
        this.onPaletteChanged = callback;
    }
}