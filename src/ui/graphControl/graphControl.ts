import { Component, WorkspaceLeaf } from "obsidian";
import { GraphView, LocalGraphView } from "obsidian-typings";
import { GCOptions, GraphInstances } from "src/internal";

export class GraphControlsUI extends Component {
    instances: GraphInstances | null;
    view: GraphView | LocalGraphView;

    graphControls: HTMLElement;

    // Sections
    sectionSettings: GCOptions;
    
    constructor(view: GraphView | LocalGraphView) {
        super();
        this.view = view;
        this.graphControls = view.containerEl.querySelector(".graph-controls") as HTMLElement;
        this.sectionSettings = new GCOptions(view);
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
        const filterSection = this.view.containerEl.querySelector(".graph-controls .graph-control-section.mod-filter") as HTMLElement;
        filterSection.style.setProperty("display", "none");
    }

    private addFilters(): void {
        const filterSection = this.view.containerEl.querySelector(".graph-controls .graph-control-section.mod-filter") as HTMLElement;
        filterSection.style.removeProperty("display");
    }
}