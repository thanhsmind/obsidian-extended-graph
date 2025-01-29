import { App } from "obsidian";
import { ExtendedGraphSettings, FoldersSet, GCFolders, getEngine, Graph, GraphEventsDispatcher, GraphsManager, GraphType, InteractiveManager, LegendUI, LinksSet, NodesSet, StatesManager, StatesUI, WorkspaceLeafExt } from "./internal";
import ExtendedGraphPlugin from "./main";
import { GraphEngine, GraphRenderer } from "obsidian-typings";

export class PluginInstances {
    static plugin: ExtendedGraphPlugin; // init in main.ts
    static app: App; // init in main.ts
    static settings: ExtendedGraphSettings; // init in main.ts
    static graphsManager: GraphsManager; // init in main.ts
    static statesManager: StatesManager; // init in main.ts
}

export class GraphInstances {
    readonly leaf: WorkspaceLeafExt;
    readonly settings: ExtendedGraphSettings;
    readonly type: GraphType;
    readonly engine: GraphEngine;
    readonly renderer: GraphRenderer;

    readonly interactiveManagers = new Map<string, InteractiveManager>();
    
    dispatcher: GraphEventsDispatcher; // init in graphEventsDispatcher.ts (constructor)
    graph: Graph; // init in graph.ts (constructor)
    
    
    nodesSet: NodesSet; // init in graph.ts (constructor)
    linksSet: LinksSet; // init in graph.ts (constructor)
    foldersSet: FoldersSet; // init in graph.ts (constructor)
    
    legendUI: LegendUI | null = null;
    foldersUI: GCFolders | null = null;
    statesUI: StatesUI;


    constructor(leaf: WorkspaceLeafExt) {
        this.leaf = leaf;
        this.settings = structuredClone(PluginInstances.settings);
        this.type = this.leaf.view.getViewType() === "graph" ? "graph" : "localgraph";
        this.engine   = getEngine(this.leaf);
        this.renderer = this.leaf.view.renderer;
    }
}