import { WorkspaceLeaf } from "obsidian";
import { GraphEngine, GraphView, LocalGraphView } from "obsidian-typings";
import { DisplayObject } from 'pixi.js';

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

export function getEngine(view: GraphView | LocalGraphView): GraphEngine | undefined {
    if (view.getViewType() === "graph") {
        return (view as GraphView).dataEngine;
    }
    else {
        return (view as LocalGraphView).engine;
    }
}

export function fadeIn(element: DisplayObject & { hasFaded: boolean, maxAlpha?: number }) {
    const increaseAlpha = () => {
        if (element.alpha < (element.maxAlpha ?? 1)) {
            element.alpha += 0.04;
            requestAnimationFrame(increaseAlpha);
        }
        else {
            element.hasFaded = true;
        }
    }

    element.alpha = 0;
    element.hasFaded = false;
    requestAnimationFrame(increaseAlpha);
}