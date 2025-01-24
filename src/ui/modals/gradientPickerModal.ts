import { App, Modal, setIcon, Setting } from "obsidian";
import { cmOptions } from "src/colors/colormaps";
import { plot_colormap } from "src/colors/colors";

export class GradientPickerModal extends Modal {
    callback: (palette: string) => void;
    selectedPalette: string = "";

    constructor(app: App, callback: (palette: string) => void) {
        super(app);
        this.setTitle("Pick palette gradient");
        this.modalEl.addClass("graph-modal-palette-picker");
        this.callback = callback;
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
            .setName("Info")
            .setHeading()
            .setDesc("These colormaps come from matplotlib. You can see more about them here: ")
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
        this.callback(this.selectedPalette);
	}
}