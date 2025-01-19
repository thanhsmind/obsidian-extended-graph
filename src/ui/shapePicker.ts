import { App, Modal, setIcon, Setting, TextComponent } from "obsidian";
import { NodeShape, ShapeEnum } from "src/graph/graphicElements/nodes/shapes";

export class ShapePickerModal extends Modal {
    callback: (shape: ShapeEnum) => void;

    constructor(app: App, callback: (shape: ShapeEnum) => void) {
        super(app);
        this.setTitle("Pick shape");
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
            .setName(shape)
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