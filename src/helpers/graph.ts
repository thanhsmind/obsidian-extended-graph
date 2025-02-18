import { WorkspaceLeaf } from "obsidian";
import { GraphEngine, GraphRenderer, GraphView, LocalGraphView } from "obsidian-typings";
import { PluginInstances } from "src/pluginInstances";

export function getBackgroundColor(renderer: GraphRenderer): Uint8Array {
    let bg = window.getComputedStyle(renderer.interactiveEl).backgroundColor;
    let el: Element = renderer.interactiveEl;
    while (bg.startsWith("rgba(") && bg.endsWith(", 0)") && el.parentElement) {
        el = el.parentElement as Element;
        bg = window.getComputedStyle(el).backgroundColor;
    }

    const canvas = createEl('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        try {
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, 1, 1);
            const RGBA = [ ... ctx.getImageData(0, 0, 1, 1).data ];
            return new Uint8Array([RGBA[0], RGBA[1], RGBA[2]]);
        }
        catch {

        }
    }

    try {
        bg = bg.replace("rgba", "").replace("rgb", "").replace("(", "").replace(")", "");
        const RGB = bg.split(", ").map(c => parseInt(c));
        return Uint8Array.from(RGB);
    }
    finally {
        if (PluginInstances.app.vault.getConfig('theme') === "moonstone ") {
            return new Uint8Array([255, 255, 255]);
        }
        else {
            return new Uint8Array([0, 0, 0]);
        }
    }
}

export function getGraphView(leaf: WorkspaceLeaf): GraphView | LocalGraphView | undefined {
    if (leaf.view.getViewType() === "graph") {
        return leaf.view as GraphView;
    }
    else if(leaf.view.getViewType() === "localgraph") {
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