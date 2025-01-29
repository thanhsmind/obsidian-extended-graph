import { Component } from "obsidian";
import { GCOptions, GraphEventsDispatcher, GraphInstances, WorkspaceLeafExt } from "src/internal";

export class GraphControlsUI extends Component {
    instances: GraphInstances | null;
    leaf: WorkspaceLeafExt;

    graphControls: HTMLElement;

    // Sections
    sectionSettings: GCOptions;
    
    constructor(leaf: WorkspaceLeafExt) {
        super();
        this.leaf = leaf;
        this.graphControls = leaf.containerEl.querySelector(".graph-controls") as HTMLElement;
        this.sectionSettings = new GCOptions(leaf);
    }

    onPluginEnabled(instances: GraphInstances): void {
        this.instances = instances;
        this.sectionSettings.onPluginEnabled(instances);
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