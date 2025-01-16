import { Component, setIcon } from "obsidian";
import { GraphEventsDispatcher } from "src/graph/graphEventsDispatcher";
import { GraphsManager } from "src/graphsManager";
import { WorkspaceLeafExt } from "src/types/leaf";

export abstract class GCSection extends Component {
    graphsManager: GraphsManager;
    dispatcher: GraphEventsDispatcher | null;
    leaf: WorkspaceLeafExt;

    graphControls: HTMLElement;

    isCollapsed: boolean;

    root: HTMLDivElement;
    treeItemChildren: HTMLDivElement;
    collapseIcon: HTMLDivElement;
    onlyWhenPluginEnabled: HTMLElement[] = [];
    
    constructor(leaf: WorkspaceLeafExt, graphsManager: GraphsManager, title: string) {
        super();
        this.leaf = leaf;
        this.graphsManager = graphsManager;
        this.graphControls = leaf.containerEl.querySelector(".graph-controls") as HTMLElement;

        this.root = this.graphControls.createDiv(`tree-item graph-control-section mod-extended-graph-${title}`);

        const collapsible = this.root.createDiv("tree-item-self mod-collapsible");
        this.collapseIcon = collapsible.createDiv("tree-item-icon collapse-icon is-collapsed");
        setIcon(this.collapseIcon, "right-triangle");
        const inner = collapsible.createDiv("tree-item-inner");
        const header = inner.createEl("header", {
            cls: "graph-control-section-header",
            text: String(title).charAt(0).toUpperCase() + String(title).slice(1)
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

    onPluginEnabled(dispatcher: GraphEventsDispatcher): void {
        this.dispatcher = dispatcher;
        this.onlyWhenPluginEnabled.forEach(el => {
            this.treeItemChildren.appendChild(el);
        });
    }

    onPluginDisabled(): void {
        this.onlyWhenPluginEnabled.forEach(el => {
            try {
                el.parentNode?.removeChild(el);
            }
            catch {

            }
        });
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
        this.root.removeChild(this.treeItemChildren);
        this.collapseIcon.addClass("is-collapsed");
        
        this.isCollapsed = true;
    }
}