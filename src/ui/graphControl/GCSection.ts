import { Component, setIcon } from "obsidian";
import { GraphEventsDispatcher, GraphsManager, setPluginIcon, WorkspaceLeafExt } from "src/internal";

export abstract class GCSection extends Component {
    graphsManager: GraphsManager;
    dispatcher: GraphEventsDispatcher | undefined;
    leaf: WorkspaceLeafExt;

    graphControls: HTMLElement;

    isCollapsed: boolean;

    root: HTMLDivElement;
    treeItemChildren: HTMLDivElement;
    collapseIcon: HTMLDivElement;
    
    constructor(leaf: WorkspaceLeafExt, graphsManager: GraphsManager, sectionID: string, title: string) {
        super();
        this.leaf = leaf;
        this.graphsManager = graphsManager;
        this.graphControls = leaf.containerEl.querySelector(".graph-controls") as HTMLElement;

        this.root = this.graphControls.createDiv(`tree-item graph-control-section mod-extended-graph-${sectionID}`);

        const collapsible = this.root.createDiv("tree-item-self mod-collapsible");
        this.collapseIcon = collapsible.createDiv("tree-item-icon collapse-icon is-collapsed");
        setIcon(this.collapseIcon, "right-triangle");
        const icon = collapsible.createDiv("tree-item-header-icon");
        setPluginIcon(icon);
        const inner = collapsible.createDiv("tree-item-inner");
        const header = inner.createEl("header", {
            cls: "graph-control-section-header",
            text: title,
        });

        collapsible.onClickEvent(() => {
            if (this.isCollapsed) {
                this.openGraphControlSection();
            }
            else {
                this.collapseGraphControlSection();
            }
        })
    }

    abstract display(enabled: boolean): void;

    onPluginEnabled(dispatcher: GraphEventsDispatcher): void {
        this.dispatcher = dispatcher;
        this.display(true);
    }

    onPluginDisabled(): void {
        this.dispatcher = undefined;
        this.display(false);
    }

    onunload(): void {
        this.root.parentNode?.removeChild(this.root);
    }

    openGraphControlSection() {
        this.root.removeClass("is-collapsed");
        this.root.appendChild(this.treeItemChildren);
        this.collapseIcon.removeClass("is-collapsed");
        this.isCollapsed = false;
    }

    collapseGraphControlSection() {
        this.root.addClass("is-collapsed");
        if (this.treeItemChildren) this.root.removeChild(this.treeItemChildren);
        this.collapseIcon.addClass("is-collapsed");
        
        this.isCollapsed = true;
    }
}