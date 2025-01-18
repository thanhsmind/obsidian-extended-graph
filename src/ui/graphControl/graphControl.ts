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
    sectionFolders?: GCFolders;
    
    constructor(leaf: WorkspaceLeafExt, graphsManager: GraphsManager) {
        super();
        this.leaf = leaf;
        this.graphsManager = graphsManager;
        this.graphControls = leaf.containerEl.querySelector(".graph-controls") as HTMLElement;

        const div = this.graphControls.createDiv("tree-item graph-control-section mod-extended-graph-title");
        const header = div.createEl("header", {
            cls: "graph-control-section-header",
            text: "Extended Graph"
        });

        this.sectionSettings = new GCSettings(leaf, graphsManager);
    }

    onPluginEnabled(dispatcher: GraphEventsDispatcher): void {
        this.sectionSettings.onPluginEnabled(dispatcher);
        this.sectionFolders?.onPluginEnabled(dispatcher);
    }

    onPluginDisabled(): void {
        this.sectionSettings.onPluginDisabled();
        this.sectionFolders?.onPluginDisabled();
    }

    addSectionFolder(foldersManager: InteractiveManager): void {
        this.sectionFolders = new GCFolders(this.leaf, this.graphsManager, foldersManager);
    }
}