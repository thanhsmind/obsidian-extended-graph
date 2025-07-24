import { DropdownComponent, Modal, Setting } from "obsidian";
import path from "path";
import { PluginInstances, t } from "src/internal";

export class ImportConfigModal extends Modal {
    callback: (filepath: string) => void;
    dropdown: DropdownComponent;

    constructor(callback: (filepath: string) => void) {
        super(PluginInstances.app);
        this.setTitle(t("controls.selectConfigToImport"));
        this.modalEl.addClass("graph-modal-import-config");
        this.callback = callback;
    }

    onOpen() {
        new Setting(this.contentEl)
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
                cb.setIcon("download");
                cb.setCta();
                cb.buttonEl.addEventListener('click', e => {
                    const value = this.dropdown.getValue();
                    if (value !== "") {
                        this.callback(value);
                    }
                    this.close();
                });
            });
    }

    onClose(): void {
        this.contentEl.empty();
    }
}