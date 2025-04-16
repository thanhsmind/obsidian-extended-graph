import { Modal, SearchComponent, Setting } from "obsidian";
import { PluginInstances, PropertiesSuggester, UIElements } from "src/internal";

export class PropertyModal extends Modal {
    callback: (name: string) => boolean;
    input: SearchComponent;

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
            .addSearch((cb) => {
                this.input = cb;
                new PropertiesSuggester(cb.inputEl, (value) => {});
            })
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