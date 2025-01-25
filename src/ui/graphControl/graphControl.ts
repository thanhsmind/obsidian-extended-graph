import { Component, Setting } from "obsidian";
import { GraphEventsDispatcher } from "src/graph/graphEventsDispatcher";
import { GraphsManager } from "src/graphsManager";
import { WorkspaceLeafExt } from "src/types/leaf";
import { GCOptions } from "./GCOptions";
import { GCFolders } from "./GCFolders";
import { InteractiveManager } from "src/graph/interactiveManager";

export class GraphControlsUI extends Component {
    graphsManager: GraphsManager;
    dispatcher: GraphEventsDispatcher | null;
    leaf: WorkspaceLeafExt;

    graphControls: HTMLElement;

    // Sections
    sectionSettings: GCOptions;
    
    constructor(leaf: WorkspaceLeafExt, graphsManager: GraphsManager) {
        super();
        this.leaf = leaf;
        this.graphsManager = graphsManager;
        this.graphControls = leaf.containerEl.querySelector(".graph-controls") as HTMLElement;
        this.sectionSettings = new GCOptions(leaf, graphsManager);
    }

    onPluginEnabled(dispatcher: GraphEventsDispatcher): void {
        this.dispatcher = dispatcher;
        this.sectionSettings.onPluginEnabled(dispatcher);
        //this.removeFilters();
    }

    onPluginDisabled(): void {
        this.sectionSettings.onPluginDisabled();
        //this.addFilters();
    }

    private removeFilters(): void {
        const filterSection = this.leaf.containerEl.querySelector(".graph-controls .graph-control-section.mod-filter") as HTMLElement;
        filterSection.style.setProperty("display", "none");
    }

    private addFilters(): void {
        const filterSection = this.leaf.containerEl.querySelector(".graph-controls .graph-control-section.mod-filter") as HTMLElement;
        filterSection.style.removeProperty("display");
    }
}