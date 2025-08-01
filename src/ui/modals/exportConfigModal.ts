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
            this.validate(this.input.getValue());
        });
    }

    onOpen() {
        new Setting(this.contentEl)
            .setName(t("controls.overrideConfig"))
            .addDropdown(async (cb) => {
                this.dropdown = cb;
                const dir = PluginInstances.configurationDirectory;
                cb.addOption("", "");
                const files = (await PluginInstances.app.vault.adapter.exists(dir))
                    ? (await PluginInstances.app.vault.adapter.list(dir)).files
                    : [];
                cb.addOptions(Object.fromEntries(files.map(file => [file, path.basename(file, ".json")])));
            })
            .addButton((cb) => {
                cb.setIcon("upload");
                cb.setCta();
                cb.buttonEl.addEventListener('click', e => {
                    this.validate(this.input.getValue());
                });
            });

        new Setting(this.contentEl)
            .setName(t("controls.orCreateConfig"))
            .addText((text) => {
                this.input = text;
            })
            .addButton((cb) => {
                cb.setIcon("upload");
                cb.setCta();
                cb.buttonEl.addEventListener('click', e => {
                    this.validate(this.input.getValue());
                })
            });
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private validate(value: string) {
        if (this.callback(value)) {
            this.close();
        }
    }
}