import { DropdownComponent, Setting } from "obsidian";
import { cmOptions, ExtendedGraphSettingTab, GradientPickerModal, plotColorMapFromName, PluginInstances } from "src/internal";
import STRINGS from "src/Strings";

export class SettingColorPalette extends Setting {
    canvasPalette: HTMLCanvasElement;
    dropdown: DropdownComponent;
    settingTab: ExtendedGraphSettingTab;

    private onPaletteChanged: (palette: string) => void

    constructor(containerEl: HTMLElement, settingTab: ExtendedGraphSettingTab, uniqueKey: string) {
        super(containerEl);
        this.settingTab = settingTab;
        this.setName(STRINGS.features.interactives.palette);
        this.controlEl.addClass("color-palette");

        // Canvas
        this.canvasPalette = this.controlEl.createEl("canvas");
        this.canvasPalette.id = `canvas-palette-${uniqueKey}`;
        this.canvasPalette.width = 100;
        this.canvasPalette.height = 20;

        // Picker icon
        this.addExtraButton(cb => {
            cb.setIcon("pipette");
            cb.onClick(() => {
                const modal = new GradientPickerModal();
                modal.onSelected(this.onSelectedFromModal.bind(this));
                modal.open();
            });
        });

        // Select
        this.addDropdown(cb => {
            this.dropdown = cb;
            // Matplotlib
            for (const [group, values] of Object.entries(cmOptions)) {
                const groupEl = cb.selectEl.createEl("optgroup");
                groupEl.label = group;
                for (const value of values) {
                    const option = groupEl.createEl("option");
                    option.value = value;
                    option.text = value;

                    const option_r = groupEl.createEl("option");
                    option_r.value = value + "_r";
                    option_r.text = value + "_r";
                }
            }
            // Custom
            this.populateCustomOptions();
            // On change
            cb.onChange(async (palette) => {
                if (palette === "") return;
                plotColorMapFromName(this.canvasPalette, palette, PluginInstances.settings);
                if (this.onPaletteChanged) this.onPaletteChanged(palette);
            });
        });
    }

    populateCustomOptions() {
        const groupEl = (this.dropdown.selectEl.querySelector(".custom-optgroup") as HTMLOptGroupElement)
            ?? this.dropdown.selectEl.createEl("optgroup", { cls: "custom-optgroup" });

        groupEl.label = STRINGS.plugin.custom;
        groupEl.replaceChildren();
        for (const value in PluginInstances.settings.customColorMaps) {
            const option = groupEl.createEl("option");
            option.value = "custom:" + value;
            option.text = value;
        }
    }

    private onSelectedFromModal(name: string) {
        if (name === "") return;
        if (this.onPaletteChanged) this.onPaletteChanged(name);
    }

    setValue(palette: string) {
        plotColorMapFromName(this.canvasPalette, palette, PluginInstances.settings);
        this.dropdown.setValue(palette);
    }

    onPaletteChange(callback: (palette: string) => void) {
        this.onPaletteChanged = callback;
    }
}