import { AbstractFormattingSuggester, PluginInstances } from "src/internal";

export class FoldersSuggester extends AbstractFormattingSuggester {
    callback: (value: string) => void;

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, callback: (value: string) => void) {
        super(textInputEl);
        this.callback = callback;
    }

    protected override getStringSuggestions(query: string): string[] {
        return PluginInstances.app.vault.getAllFolders()
            .map(folder => folder.path);
    }

    override selectSuggestion(value: HTMLElement, evt: MouseEvent | KeyboardEvent): void {
        this.setValue(value.innerText);
        this.callback(value.innerText);
        this.close();
    }
}