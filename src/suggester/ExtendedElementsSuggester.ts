import { AbstractInputSuggest } from "obsidian";
import { ExtendedGraphNode, FOLDER_KEY } from "src/internal";
import { GraphInstances, PluginInstances } from "src/pluginInstances";

type SetType = 'nodes' | 'pinned' | 'folders';

export class ExtendedElementsSuggester extends AbstractInputSuggest<string> {
    instances: GraphInstances;
    set: SetType;
    callback: (value: string) => void;

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, instances: GraphInstances, set: SetType, callback: (value: string) => void) {
        super(PluginInstances.app, textInputEl);
        this.instances = instances;
        this.set = set;
        this.callback = callback;
    }

    protected getSuggestions(query: string): string[] {
        switch (this.set) {
            case 'nodes':
                return [...this.instances.nodesSet.extendedElementsMap.keys()]
                    .filter(id => id.toLowerCase().contains(query.toLowerCase()))
            case 'pinned':
                return [...this.instances.nodesSet.extendedElementsMap.values()]
                    .reduce((acc: string[], curr: ExtendedGraphNode) => {
                        if (curr.isPinned && curr.id.toLowerCase().contains(query.toLowerCase())) acc.push(curr.id);
                        return acc;
                    }, []);
            case 'folders':
                if (!this.instances.foldersSet) return [];
                const manager = this.instances.foldersSet.managers.get(FOLDER_KEY);
                if (!manager) return [];

                return manager.getTypesWithoutNone()
                    .filter(id => id.toLowerCase().contains(query.toLowerCase()));
        }
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