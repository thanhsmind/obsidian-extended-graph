import { ButtonComponent, ColorComponent, KeymapContext, Modal, Setting } from "obsidian";
import { hex2rgb, plotColorMap, rgb2hex } from "src/internal";
import { PluginInstances } from "src/pluginInstances";
import STRINGS from "src/Strings";

export class GradientMakerModal extends Modal {
    canvasContainer: HTMLDivElement;
    canvasGradient: HTMLCanvasElement;

    targetHandle?: ColorComponent;
    cmapData: {
        handle: ColorComponent,
        color: Uint8Array,
        stop: number
    }[] = [];
    interpolate: boolean = true;
    reverse: boolean = false;
    name: string;
    nameSetting: Setting;
    saveButton: ButtonComponent;
    saveCallback?: (name: string) => any;

    constructor(name?: string) {
        super(PluginInstances.app);
        this.name = name ?? "";
        this.modalEl.addClass("graph-modal-palette-maker")
    }

    onOpen(): void {
        this.addCanvas();
        this.addHandles();
        this.addControls();
        this.addListeners();
        this.updateCanvas();
    }

    private addCanvas() {
        this.canvasContainer = this.contentEl.createDiv("canvas-gradient-maker-container")
        this.canvasGradient = this.canvasContainer.createEl("canvas");
        this.canvasGradient.id = `canvas-gradient-maker`;
    }

    private addHandles() {
        if (this.name in PluginInstances.settings.customColorMaps) {
            const data = PluginInstances.settings.customColorMaps[this.name];
            this.reverse = data.reverse;
            this.interpolate = data.interpolate;
            const colorsStopsMap = data.colors.map((c, i) => { return { col: c, stop: data.stops[i] } });
            for (const { col, stop } of colorsStopsMap) {
                this.addHandle(new Uint8Array([col[0] * 255, col[1] * 255, col[2] * 255]), stop)
            }
        }
        else {
            this.addHandle(new Uint8Array([255, 0, 0]), 0);
            this.addHandle(new Uint8Array([0, 255, 0]), 0.5);
            this.addHandle(new Uint8Array([0, 0, 255]), 1);
        }
    }

    private addHandle(color: Uint8Array, stop: number) {
        const colorComponent = new ColorComponent(this.canvasContainer);
        this.cmapData.push({
            handle: colorComponent,
            color: color,
            stop: stop
        });

        colorComponent.setValue(rgb2hex(color));
        colorComponent.onChange((value) => {
            const data = this.cmapData.find(v => v.handle === colorComponent);
            if (data) {
                data.color = hex2rgb(value);
                this.updateCanvas();
            }
        })

        colorComponent.colorPickerEl.style.left = (100 * stop) + "%";
        colorComponent.colorPickerEl.addEventListener("mousedown", (e) => this.onDragStart(e, colorComponent));
        colorComponent.colorPickerEl.addEventListener("mouseenter", () => this.targetHandle = colorComponent);
        colorComponent.colorPickerEl.addEventListener("mouseleave", () => this.targetHandle = undefined);
    }

    private addListeners() {
        this.canvasContainer.addEventListener("dblclick", this.onAddHandle.bind(this))
        this.scope.register(null, "Backspace", this.onDeleteHandle.bind(this));
        this.scope.register(null, "Clear", this.onDeleteHandle.bind(this));
        this.scope.register(null, "Delete", this.onDeleteHandle.bind(this));
    }

    private onAddHandle(e: MouseEvent) {
        if (0 !== e.button) return;
        if (e.targetNode?.nodeName !== "CANVAS") return;

        const bbox = this.canvasContainer.getBoundingClientRect();
        const left = Math.clamp((e.clientX - bbox.left) / bbox.width, 0, 1);
        const imageData = this.canvasGradient.getContext("2d", { willReadFrequently: true })?.getImageData(left * this.canvasGradient.width, 0.5, 1, 1);
        if (!imageData) return;
        const data = imageData.data;

        this.addHandle(new Uint8Array([data[0], data[1], data[2]]), left);
    }

    private onDeleteHandle(evt: KeyboardEvent, ctx: KeymapContext) {
        if (!this.targetHandle) return;
        if (this.cmapData.length <= 2) return;

        const data = this.cmapData.find(val => val.handle === this.targetHandle);
        if (!data) return;

        this.cmapData.remove(data)
        data.handle.colorPickerEl.detach();
        this.targetHandle = undefined;
        this.updateCanvas();
    }

    private onDragStart(e: MouseEvent, colorComponent: ColorComponent) {
        if (0 !== e.button) return;
        const index = this.cmapData.findIndex(v => v.handle === colorComponent);
        if (index === -1) return;
        const el = colorComponent.colorPickerEl;
        e.preventDefault();
        e.stopPropagation();
        const bbox = this.canvasContainer.getBoundingClientRect();
        const onMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            const x = e.clientX;
            const left = Math.clamp((x - bbox.left) / bbox.width, 0, 1);
            el.style.left = (100 * left) + "%";
            this.cmapData[index].stop = left;
            this.updateCanvas();
        }
        const onMouseUp = (e: MouseEvent) => {
            e.preventDefault();
            el.win.removeEventListener("mousemove", onMouseMove);
            el.win.removeEventListener("mouseup", onMouseUp);
        }
        el.win.addEventListener("mousemove", onMouseMove);
        el.win.addEventListener("mouseup", onMouseUp);
    }

    private addControls() {
        new Setting(this.contentEl)
            .setName(STRINGS.controls.interpolate)
            .addToggle(cb => {
                cb.setValue(this.interpolate);
                cb.onChange(value => {
                    this.interpolate = value;
                    this.updateCanvas();
                })
            });

        new Setting(this.contentEl)
            .setName(STRINGS.controls.reverse)
            .addToggle(cb => {
                cb.setValue(this.reverse);
                cb.onChange(value => {
                    this.reverse = value;
                    //this.updateCanvas();
                })
            });

        this.nameSetting = new Setting(this.contentEl)
            .setName(STRINGS.UI.name)
            .addText(cb => {
                cb.setValue(this.name);
                cb.onChange(name => {
                    this.name = name;
                    this.onNameChanged();
                });
            });

        new Setting(this.contentEl)
            .addButton((cb => {
                this.saveButton = cb;
                cb.setButtonText(STRINGS.controls.save);
                cb.setCta();
                cb.onClick(this.save.bind(this));
            }));

        this.onNameChanged();
    }

    private onNameChanged() {
        if (this.name === "") {
            this.nameSetting.setDesc(STRINGS.errors.paletteNameRequired);
            this.nameSetting.descEl.toggleClass("error", true);
        }
        else {
            this.nameSetting.setDesc("");
            this.nameSetting.descEl.toggleClass("error", true);
        }
        if (this.name in PluginInstances.settings.customColorMaps) {
            this.saveButton.setButtonText(STRINGS.controls.override);
        }
        else {
            this.saveButton.setButtonText(STRINGS.controls.save);
        }
    }

    private updateCanvas() {
        plotColorMap(
            this.canvasGradient,
            false,  // always display the non-reversed gradient
            this.interpolate,
            this.cmapData.map(v => [v.color[0] / 255, v.color[1] / 255, v.color[2] / 255]),
            this.cmapData.map(v => v.stop)
        );
    }

    private save() {
        if (this.name === "") return;

        PluginInstances.settings.customColorMaps[this.name] = {
            colors: this.cmapData.map(v => [v.color[0] / 255, v.color[1] / 255, v.color[2] / 255]),
            stops: this.cmapData.map(v => v.stop),
            interpolate: this.interpolate,
            reverse: this.reverse,
        }
        PluginInstances.plugin.saveSettings();
        if (this.saveCallback) this.saveCallback(this.name);
        this.close();
    }

    onSave(callback: (name: string) => void) {
        this.saveCallback = callback;
    }
}