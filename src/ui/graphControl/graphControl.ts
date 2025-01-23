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
        this.sectionSettings = new GCSettings(leaf, graphsManager);
    }

    onPluginEnabled(dispatcher: GraphEventsDispatcher): void {
        this.dispatcher = dispatcher;
        this.sectionSettings.onPluginEnabled(dispatcher);
        this.addSectionFolder();
    }

    onPluginDisabled(): void {
        this.sectionSettings.onPluginDisabled();
        this.removeSectionFolder();
    }

    private addSectionFolder(): void {
        if (!this.graphsManager.plugin.settings.enableFeatures['folders']) return;
        if (!this.sectionFolders) {
            const foldersManager = this.dispatcher?.graph.folderBlobs.manager;
            if (!foldersManager) return;
            this.sectionFolders = new GCFolders(this.leaf, this.graphsManager, foldersManager);
            this.sectionFolders.display();
        }
        else {
            this.sectionFolders.foldersManager = this.dispatcher?.graph.folderBlobs.manager ?? undefined;
            this.sectionFolders.graphControls.appendChild(this.sectionFolders.root);
        }
        console.log(this.sectionFolders);
    }

    private removeSectionFolder(): void {
        this.sectionFolders?.root.remove();
    }
}