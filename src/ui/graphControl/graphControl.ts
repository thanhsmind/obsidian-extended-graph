import { Component, Setting } from "obsidian";
import { GraphEventsDispatcher } from "src/graph/graphEventsDispatcher";
import { GraphsManager } from "src/graphsManager";
import { WorkspaceLeafExt } from "src/types/leaf";
import { GCSettings } from "./GCSettings";
import { GCFolders } from "./GCFolders";
import { InteractiveManager } from "src/graph/interactiveManager";

export class GraphControlsUI extends Component {
    graphsManager: GraphsManager;
    dispatcher: GraphEventsDispatcher | null;
    leaf: WorkspaceLeafExt;

    graphControls: HTMLElement;

    // Sections
    sectionSettings: GCSettings;
    
    constructor(leaf: WorkspaceLeafExt, graphsManager: GraphsManager) {
        super();
        this.leaf = leaf;
        this.graphsManager = graphsManager;
        this.graphControls = leaf.containerEl.querySelector(".graph-controls") as HTMLElement;
        this.sectionSettings = new GCSettings(leaf, graphsManager);
    }

    onPluginEnabled(dispatcher: GraphEventsDispatcher): void {
        this.dispatcher = dispatcher;
        this.sectionSettings.onPluginEnabled(dispatcher);
    }

    onPluginDisabled(): void {
        this.sectionSettings.onPluginDisabled();
    }
}