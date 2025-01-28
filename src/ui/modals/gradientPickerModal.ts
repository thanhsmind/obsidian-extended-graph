import { App, Modal, setIcon, Setting } from "obsidian";
import { cmOptions, plot_colormap } from "src/internal";
import STRINGS from "src/Strings";

export class GradientPickerModal extends Modal {
    callback: (palette: string) => void;
    selectedPalette: string = "";

    constructor(app: App) {
        super(app);
        this.setTitle(STRINGS.features.interactives.palettePickGradient);
        this.modalEl.addClass("graph-modal-palette-picker");
    }

    onOpen() {
        for (const [group, palettes] of Object.entries(cmOptions)) {
            this.addPalettesGroup(group, palettes);
        }
        this.addInfo();
    }

    private addPalettesGroup(name: string, palettes: string[]) {
        const group = new Setting(this.contentEl)
            .setName(name)
            .setHeading();
        group.controlEl.addClass("palette-group");

        for (const palette of palettes) {
            this.addPalette(palette, group.controlEl);
        }
    }

    private addPalette(palette: string, container: HTMLElement) {
        const setting = new Setting(container)
            .setName(palette)
            .then(setting => {
                const canvasPalette = setting.controlEl.createEl("canvas");
                canvasPalette.id = `picker-canvas-palette-${palette}`;
                canvasPalette.width = 100;
                canvasPalette.height = 20;
                plot_colormap(canvasPalette.id, palette, false);
            });
        setting.settingEl.onclick = () => {
            this.selectedPalette = palette;
            this.close();
        }
    }

    private addInfo() {
        new Setting(this.contentEl)
            .setName(STRINGS.plugin.info)
            .setHeading()
            .setDesc(STRINGS.features.interactives.paletteMatplotlibDesc)
            .then(setting => {
                const iconEl = createDiv();
                setting.nameEl.prepend(iconEl);
                setIcon(iconEl, 'info');

                const link = setting.descEl.createEl("a");
                link.href = "https://matplotlib.org/stable/users/explain/colors/colormaps.html";
                link.setText("https://matplotlib.org/stable/users/explain/colors/colormaps.html");
            })

    }
    
	onClose(): void {
		this.contentEl.empty();
        if (this.selectedPalette !== "") this.callback(this.selectedPalette);
	}

    onSelected(callback: (palette: string) => void) {
        this.callback = callback;
    }
}