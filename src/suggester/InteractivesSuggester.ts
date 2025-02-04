import { AbstractInputSuggest } from "obsidian";
import { getFileInteractives } from "src/helperFunctions";
import { FOLDER_KEY, LINK_KEY, SourceKey, TAG_KEY } from "src/internal";
import { PluginInstances } from "src/pluginInstances";

export class InteractivesSuggester extends AbstractInputSuggest<string> {
    key: SourceKey | undefined;
    propertyKey: string | undefined;
    callback: (value: string) => void;

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, callback: (value: string) => void) {
        super(PluginInstances.app, textInputEl);
        this.callback = callback;
    }

    protected getSuggestions(query: string): string[] {
        if (!this.key) return [];
        const files = PluginInstances.app.vault.getMarkdownFiles();
        let values: string[] = [];

        switch (this.key) {
            case 'tag':
                for (const file of files) {
                    values = values.concat([...getFileInteractives(TAG_KEY, file)]);
                }
                break;
            case 'property':
                if (!this.propertyKey) return [];
                for (const file of files) {
                    values = values.concat([...getFileInteractives(this.propertyKey, file)]);
                }
                break;
            case 'link':
                for (const file of files) {
                    values = values.concat([...getFileInteractives(LINK_KEY, file)]);
                }
                break;
            case 'folder':
            case 'folderRec':
                for (const file of files) {
                    values = values.concat([...getFileInteractives(FOLDER_KEY, file)]);
                }
                break;
            case 'file':
                values = files.map(file => file.path);
                break;
            default:
                break;
        }


        let sortedValues = new Set(values.sort());
        return [...sortedValues];
    }

    setKey(key?: SourceKey, propertyKey?: string): void {
        this.key = key;
        this.propertyKey = propertyKey;
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