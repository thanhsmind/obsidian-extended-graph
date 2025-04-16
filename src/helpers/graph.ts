import { WorkspaceLeaf } from "obsidian";
import { GraphEngine, GraphView, LocalGraphView } from "obsidian-typings";

export function getGraphView(leaf: WorkspaceLeaf): GraphView | LocalGraphView | undefined {
    if (leaf.view.getViewType() === "graph") {
        return leaf.view as GraphView;
    }
    else if (leaf.view.getViewType() === "localgraph") {
        return leaf.view as LocalGraphView;
    }
    else {
        return;
    }
}

export function hasEngine(leaf: WorkspaceLeaf): boolean {
    if (leaf.view.getViewType() === "graph") {
        return leaf.view.hasOwnProperty("dataEngine");
    }
    else {
        return leaf.view.hasOwnProperty("engine");
    }
}

export function getEngine(view: GraphView | LocalGraphView): GraphEngine {
    if (view.getViewType() === "graph") {
        return (view as GraphView).dataEngine;
    }
    else {
        return (view as LocalGraphView).engine;
    }
}