import { AbstractFormattingSuggester, FOLDER_KEY, getFileInteractives, getOutlinkTypes, LINK_KEY, PluginInstances, SourceKey, TAG_KEY } from "src/internal";

export class InteractivesSuggester extends AbstractFormattingSuggester {
    key: SourceKey | undefined;
    propertyKey: string | undefined;
    callback: (value: string) => void;

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, callback: (value: string) => void) {
        super(textInputEl);
        this.callback = callback;
    }

    protected override getStringSuggestions(query: string): string[] {
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
                    const types = [...getOutlinkTypes(PluginInstances.settings, file).values()].flat();
                    values = values.concat(types.reduce((a: string[], c: Set<string>) => a.concat([...c]), []));
                    values = [... new Set(values)];
                }
                break;
            case 'folder':
            case 'folderRec':
                for (const file of files) {
                    values = values.concat([...getFileInteractives(FOLDER_KEY, file)]);
                }
                break;
            case 'file':
                values = files.map(file => file.basename);
                break;
            case 'path':
                values = files.map(file => file.path);
                break;
            default:
                break;
        }

        let filteredValues = values.filter(value => value.toLowerCase().contains(query.toLowerCase()));
        let sortedValues = new Set(filteredValues.sort());
        return [...sortedValues];
    }

    setKey(key?: SourceKey, propertyKey?: string): void {
        this.key = key;
        this.propertyKey = propertyKey;
    }

    override selectSuggestion(value: HTMLElement, evt: MouseEvent | KeyboardEvent): void {
        this.setValue(value.innerText);
        this.callback(value.innerText);
        this.close();
    }
}