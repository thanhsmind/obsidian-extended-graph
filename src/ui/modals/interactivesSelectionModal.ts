import { Modal, TextComponent } from "obsidian";
import { getFileInteractives, PluginInstances } from "src/internal";
import STRINGS from "src/Strings";

export class InteractivesSelectionModal extends Modal {
    key: string;
    input: TextComponent;
    types: string[];

    constructor(key: string, types: string[]) {
        super(PluginInstances.app);
        this.key = key;
        this.types = types;
        this.setTitle(STRINGS.features.interactives.selectionFor + ": " + this.key);
        this.modalEl.addClass("graph-modal-interactives-selection");
    }

    onOpen() {
        for (const type of this.types) {
            const isActive = !PluginInstances.settings.interactiveSettings[this.key].unselected.includes(type);
            const label = this.contentEl.createEl("label");
            const text = label.createSpan({ text: type });
            const toggle = label.createEl("input", { type: "checkbox" });
            isActive ? this.selectInteractive(label, toggle) : this.deselectInteractive(label, toggle);
            toggle.addEventListener("change", e => {
                toggle.checked ? this.selectInteractive(label, toggle) : this.deselectInteractive(label, toggle);
            })
        }
    }

    private selectInteractive(label: HTMLLabelElement, toggle: HTMLInputElement) {
        label.addClass("is-active");
        toggle.checked = true;
        if (PluginInstances.settings.interactiveSettings[this.key].unselected.includes(label.innerText)) {
            PluginInstances.settings.interactiveSettings[this.key].unselected.remove(label.innerText);
            PluginInstances.plugin.saveSettings();
        }
    }

    private deselectInteractive(label: HTMLLabelElement, toggle: HTMLInputElement) {
        label.removeClass("is-active");
        toggle.checked = false;
        if (!PluginInstances.settings.interactiveSettings[this.key].unselected.includes(label.innerText)) {
            PluginInstances.settings.interactiveSettings[this.key].unselected.push(label.innerText);
            PluginInstances.plugin.saveSettings();
        }
    }

    onClose(): void {
        this.contentEl.empty();
    }
}