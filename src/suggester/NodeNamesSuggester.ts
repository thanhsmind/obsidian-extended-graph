import { AbstractInputSuggest, App } from "obsidian";
import { GraphRenderer } from "obsidian-typings";
import { PluginInstances } from "src/pluginInstances";

export class NodeNameSuggester extends AbstractInputSuggest<string> {
    graph: GraphRenderer;
    callback: (value: string) => void;

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, graph: GraphRenderer, callback: (value: string) => void) {
        super(PluginInstances.app, textInputEl);
        this.graph = graph;
        this.callback = callback;
    }

    protected getSuggestions(query: string): string[] {
        return this.graph.nodes.filter(node => node.id.toLowerCase().contains(query.toLowerCase())).map(node => node.id);
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