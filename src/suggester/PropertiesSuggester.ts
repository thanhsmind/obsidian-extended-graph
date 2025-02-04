import { AbstractInputSuggest } from "obsidian";
import { PluginInstances } from "src/pluginInstances";

export class PropertiesSuggester extends AbstractInputSuggest<string> {
    callback: (value: string) => void;

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, callback: (value: string) => void) {
        super(PluginInstances.app, textInputEl);
        this.callback = callback;
    }

    protected getSuggestions(query: string): string[] {
        return Object.keys(PluginInstances.app.metadataTypeManager.properties);
    }

    renderSuggestion(value: string, el: HTMLElement): void {
        el.textContent = value;
    }

    selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
        this.setValue(value);
        this.callback(value);
        this.close();
    }
}