import { App, ColorComponent, SearchComponent, Setting, TextComponent } from "obsidian";
import { GraphColorAttributes, GraphPluginInstanceOptions } from "./graphPluginInstance";
import { GraphRenderer } from "./renderer";
import { LocalGraphView, TreeItem } from "obsidian-typings";
import { GraphView } from "src/views/view";

export interface GraphEngine {
    /** @internal */
    app: App;
    /** @internal */
    colorGroupOptions: GraphColorGroupOptions;
    /** @internal */
    controlsEl: HTMLDivElement;
    /** @internal */
    currentFocusFile: string;
    /** @internal */
    displayOptions: GraphDisplayOptions;
    /** @internal */
    fileFilter: unknown;
    /** @internal */
    filterOptions: GraphFilterOptions;
    /** @internal */
    forceOptions: GraphForceOptions;
    /** @internal */
    hasFilter: boolean;
    /** @internal */
    hoverPopover: unknown;
    /** @internal */
    lastHoverLink: unknown;
    /** @internal */
    options: GraphPluginInstanceOptions;
    /** @internal */
    progression: number;
    /** @internal */
    progressionSpeed: number;
    /** @internal */
    renderer: GraphRenderer;
    /** @internal */
    searchQueries: {
        query: unknown,
        color: GraphColorAttributes
    }[];
    /** @internal */
    view: LocalGraphView | GraphView;

    /**
     * Gets the engine options
     * @internal
     */
    getOptions(): GraphPluginInstanceOptions;
    /**
     * Sets the engine options
     * @param options - New options. Undefined elements will not be considered.
     * @internal
     */
    setOptions(options: GraphPluginInstanceOptions | undefined): void;
    /**
     * Updates the engine after the search filter has changed
     * @internal
     */
    updateSearch(): void;
}

export interface GraphOptions extends TreeItem<unknown> {
    /** @internal */
    getOptions(e: unknown): unknown;
    /** @internal */
    setOptions(e: unknown): unknown;
}

export interface GraphColorGroupOptions extends GraphOptions {
    groups: {
        color: ColorComponent,
        el: HTMLDivElement,
        query: TextComponent,
    }[];
}

export interface GraphDisplayOptions extends GraphOptions {

}

export interface GraphFilterOptions extends GraphOptions {
    search: SearchComponent;
    searchSetting: Setting;
}

export interface GraphForceOptions extends GraphOptions {

}