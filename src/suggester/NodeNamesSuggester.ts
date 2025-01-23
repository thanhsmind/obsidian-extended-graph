import { AbstractInputSuggest, App } from "obsidian";
import { Graph } from "src/graph/graph";

export class NodeNameSuggester extends AbstractInputSuggest<string> {
    graph: Graph;
    callback: (value: string) => void;

    constructor(app: App, textInputEl: HTMLInputElement | HTMLDivElement, graph: Graph, callback: (value: string) => void) {
        super(app, textInputEl);
        this.graph = graph;
        this.callback = callback;
    }

    protected getSuggestions(query: string): string[] | Promise<string[]> {
        return [...this.graph.nodesSet.connectedIDs.values()];
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