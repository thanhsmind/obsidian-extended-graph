import { AbstractFormattingSuggester } from "src/internal";
import { PluginInstances } from "src/pluginInstances";

export class PropertiesSuggester extends AbstractFormattingSuggester {
    callback: (value: string) => void;

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, callback: (value: string) => void) {
        super(textInputEl);
        this.callback = callback;
    }

    protected getStringSuggestions(query: string): string[] {
        const values = Object.keys(PluginInstances.app.metadataTypeManager.properties);

        let filteredValues = values.filter(value => value.contains(query));
        let sortedValues = new Set(filteredValues.sort());
        return [...sortedValues];
    }

    override selectSuggestion(value: HTMLElement, evt: MouseEvent | KeyboardEvent): void {
        this.setValue(value.innerText);
        this.callback(value.innerText);
        this.close();
    }
}