import { App, Modal, Setting } from "obsidian";
import { NodeShape, ShapeEnum } from "src/internal";
import STRINGS from "src/Strings";

export class ShapePickerModal extends Modal {
    callback: (shape: ShapeEnum) => void;

    constructor(app: App, callback: (shape: ShapeEnum) => void) {
        super(app);
        this.setTitle(STRINGS.features.shapePick);
        this.modalEl.addClass("graph-modal-shape-picker");
        this.callback = callback;
    }

    onOpen() {
        const values = Object.keys(ShapeEnum);
        for (const enumKey of values) {
            this.addShape(ShapeEnum[enumKey as keyof typeof ShapeEnum]);
        }
    }

    private addShape(shape: ShapeEnum) {
        const svg = NodeShape.getSVG(shape);
        new Setting(this.contentEl)
            .setName(STRINGS.features.shapesNames[shape])
            .then(setting => {
                setting.controlEl.appendChild(svg);
                setting.controlEl.onclick = (ev => {
                    this.callback(shape);
                });
            });
    }
    
	onClose(): void {
		this.contentEl.empty();
	}
}