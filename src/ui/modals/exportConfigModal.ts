import { DropdownComponent, Modal, Setting, TextComponent } from "obsidian";
import path from "path";
import { PluginInstances, t } from "src/internal";

export class ExportConfigModal extends Modal {
    callback: (name: string) => boolean;
    input: TextComponent;
    dropdown: DropdownComponent;
    name?: string;

    constructor(callback: (name: string) => boolean) {
        super(PluginInstances.app);
        this.setTitle(t("controls.setConfigName"));
        this.modalEl.addClass("graph-modal-export-config");
        this.callback = callback;

        this.scope.register(null, "Enter", (e: KeyboardEvent) => {
            if (this.callback(this.input.getValue())) {
                this.close();
            }
        });
    }

    onOpen() {
        new Setting(this.contentEl)
            .setName(t("controls.overrideConfig"))
            .addDropdown(async (cb) => {
                this.dropdown = cb;
                const dir = PluginInstances.configurationDirectory;
                cb.addOption("", "");
                const files = (await PluginInstances.app.vault.adapter.list(dir)).files;
                cb.addOptions(Object.fromEntries(files.map(file => [file, path.basename(file, ".json")])));
            })
            .addButton((cb) => {
                cb.setIcon("upload");
                cb.setCta();
                cb.buttonEl.addEventListener('click', e => {
                    const value = this.dropdown.getValue();
                    if (value !== "") {
                        this.callback(value);
                    }
                    this.close();
                });
            });

        new Setting(this.contentEl)
            .setName(t("controls.orCreateCongig"))
            .addText((text) => {
                this.input = text;
            })
            .addButton((cb) => {
                cb.setIcon("upload");
                cb.setCta();
                cb.buttonEl.addEventListener('click', e => {
                    const value = this.input.getValue();
                    if (value !== "") {
                        this.callback(value);
                    }
                    this.close();
                })
            });
    }

    onClose(): void {
        this.contentEl.empty();
    }
}