import { App } from "obsidian";
import { ExtendedGraphSettings, FoldersSet, Graph, GraphEventsDispatcher, GraphsManager, LinksSet, NodesSet, StatesManager } from "./internal";
import ExtendedGraphPlugin from "./main";

export class PluginInstances {
    static plugin: ExtendedGraphPlugin; // init in main.ts
    static app: App; // init in main.ts
    static settings: ExtendedGraphSettings; // init in main.ts
    static graphsManager: GraphsManager; // init in main.ts
    static statesManager: StatesManager; // init in main.ts
    static dispatchers: {[leafID: string]: GraphInstances}
}

export class GraphInstances {
    dispatcher: GraphEventsDispatcher;
    graph: Graph;
    nodesSet: NodesSet;
    linksSet: LinksSet;
    folderSet: FoldersSet;
    settings: ExtendedGraphSettings;
}