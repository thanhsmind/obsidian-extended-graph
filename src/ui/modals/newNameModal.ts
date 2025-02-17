import { Modal, Setting, TextComponent } from "obsidian";
import { PluginInstances, UIElements } from "src/internal";

export class NewNameModal extends Modal {
    callback: (name: string) => boolean;
    input: TextComponent;

    constructor(title: string, callback: (name: string) => boolean) {
        super(PluginInstances.app);
        this.setTitle(title);
        this.modalEl.addClass("graph-modal-new");
        this.callback = callback;

        this.scope.register(null, "Enter", (e: KeyboardEvent) => {
            if (this.callback(this.input.getValue())) {
                this.close();
            }
        });
    }

    onOpen() {
        new Setting(this.contentEl)
            .addText((text) => { this.input = text; })
            .addButton((cb) => {
                UIElements.setupButton(cb, 'add');
                cb.buttonEl.addEventListener('click', e => {
                    if (this.callback(this.input.getValue())) {
                        this.close();
                    }
                })
            });
    }
    
	onClose(): void {
		this.contentEl.empty();
	}
}