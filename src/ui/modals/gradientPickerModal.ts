import { randomUUID } from "crypto";
import { ButtonComponent, ExtraButtonComponent, Modal, setIcon, Setting } from "obsidian";
import { cmOptions, GradientMakerModal, plotColorMap, plotColorMapFromName, PluginInstances, UIElements } from "src/internal";
import STRINGS from "src/Strings";

export class GradientPickerModal extends Modal {
    callback: (palette: string) => void;
    selectedPalette: string = "";
    customPalettes: Record<string, { name: string, setting: Setting, canvas: HTMLCanvasElement }> = {};

    constructor() {
        super(PluginInstances.app);
        this.setTitle(STRINGS.features.interactives.palettePickGradient);
        this.modalEl.addClass("graph-modal-palette-picker");
    }

    onOpen() {
        for (const [group, palettes] of Object.entries(cmOptions)) {
            this.addPalettesGroup(group, palettes);
        }
        this.addCustomPalettesGroup();
        this.addInfo();
    }

    private addPalettesGroup(name: string, palettes: string[]) {
        const group = new Setting(this.contentEl)
            .setName(name)
            .setHeading();
        group.controlEl.addClass("palette-group");

        for (const palette of palettes) {
            this.addPalette(palette, group.controlEl);
            this.addPalette(palette + "_r", group.controlEl);
        }
    }

    private addPalette(palette: string, container: HTMLElement) {
        const setting = new Setting(container)
            .setName(palette);

        const canvasPalette = setting.controlEl.createEl("canvas");
        canvasPalette.id = `picker-canvas-palette-${palette}`;
        canvasPalette.width = 100;
        canvasPalette.height = 20;
        plotColorMapFromName(canvasPalette, palette, PluginInstances.settings);
        canvasPalette.onclick = () => {
            this.selectedPalette = palette;
            this.close();
        }
    }

    private addCustomPalettesGroup() {
        const group = new Setting(this.contentEl)
            .setName(STRINGS.plugin.custom)
            .setHeading();
        new ButtonComponent(group.infoEl)
            .then(cb => {
                UIElements.setupButton(cb, "add");
                cb.onClick(() => {
                    const modal = new GradientMakerModal();
                    modal.onSave(name => {
                        this.addCustomPalette(name, group.controlEl);
                        this.selectedPalette = "custom:" + name;
                        this.callback(this.selectedPalette);
                    });
                    modal.open();
                });
            });
        group.controlEl.addClass("palette-group");

        for (const palette in PluginInstances.settings.customColorMaps) {
            this.addCustomPalette(palette, group.controlEl);
        }
    }

    private addCustomPalette(name: string, container: HTMLElement) {
        const data = PluginInstances.settings.customColorMaps[name];
        if (!data) return;

        const existing = Object.entries(this.customPalettes).find(([id, el]) => el.name === name);
        let id: string;
        if (!existing) {
            id = randomUUID();
            const setting = new Setting(container).setName(name);
            setting.settingEl.addClass("custom-palette");

            const canvas = setting.controlEl.createEl("canvas");
            canvas.id = `picker-canvas-custom-palette-${id}`;
            canvas.width = 100;
            canvas.height = 20;

            new ExtraButtonComponent(setting.infoEl)
                .then(cb => {
                    UIElements.setupExtraButton(cb, "edit");
                    cb.onClick(() => this.editCustomPalette(id));
                });

            new ExtraButtonComponent(setting.infoEl)
                .then(cb => {
                    UIElements.setupExtraButton(cb, "delete");
                    cb.onClick(() => this.deleteCustomPalette(id));
                });

            canvas.onclick = () => this.selectCustomPalette(id);

            this.customPalettes[id] = { name, setting, canvas };
        }
        else {
            id = existing[0];
        }

        plotColorMap(this.customPalettes[id].canvas, data.reverse, data.interpolate, data.colors, data.stops);
    }

    private editCustomPalette(id: string) {
        const name = this.customPalettes[id].name;
        const modal = new GradientMakerModal(name);
        modal.onSave(newName => {
            this.onCustomPaletteEdited(id, name, newName);
        });
        modal.open();
    }

    private onCustomPaletteEdited(id: string, oldName: string, newName: string) {
        const data = PluginInstances.settings.customColorMaps[newName];
        if (!data) return;

        if (oldName !== newName) {
            delete PluginInstances.settings.customColorMaps[oldName];
            for (const key in PluginInstances.settings.interactiveSettings) {
                if (PluginInstances.settings.interactiveSettings[key].colormap === oldName) {
                    PluginInstances.settings.interactiveSettings[key].colormap = newName;
                }
            }
            if (PluginInstances.settings.nodesColorColormap === oldName) {
                PluginInstances.settings.nodesColorColormap = newName;
            }
            if (PluginInstances.settings.linksColorColormap === oldName) {
                PluginInstances.settings.linksColorColormap = newName;
            }
            PluginInstances.plugin.saveSettings();
        }
        this.selectedPalette = "custom:" + newName;
        this.callback(this.selectedPalette);

        this.customPalettes[id].name = newName;
        this.customPalettes[id].setting.setName(newName);
        plotColorMap(this.customPalettes[id].canvas, data.reverse, data.interpolate, data.colors, data.stops);
    }

    private deleteCustomPalette(id: string) {
        const name = this.customPalettes[id].name;

        delete PluginInstances.settings.customColorMaps[name];
        for (const key in PluginInstances.settings.interactiveSettings) {
            if (PluginInstances.settings.interactiveSettings[key].colormap === name) {
                PluginInstances.settings.interactiveSettings[key].colormap = "rainbow";
            }
        }
        if (PluginInstances.settings.nodesColorColormap === name) {
            PluginInstances.settings.nodesColorColormap = "rainbow";
        }
        if (PluginInstances.settings.linksColorColormap === name) {
            PluginInstances.settings.linksColorColormap = "rainbow";
        }
        PluginInstances.plugin.saveSettings();

        this.selectedPalette = "rainbow";
        this.callback(this.selectedPalette);
        this.customPalettes[id].setting.settingEl.detach();
        delete this.customPalettes[id];
    }

    private selectCustomPalette(id: string) {
        this.selectedPalette = "custom:" + this.customPalettes[id].name;
        this.close();
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


    override onClose(): void {
        this.contentEl.empty();
        if (this.selectedPalette !== "") this.callback(this.selectedPalette);
    }

    onSelected(callback: (palette: string) => void) {
        this.callback = callback;
    }
}