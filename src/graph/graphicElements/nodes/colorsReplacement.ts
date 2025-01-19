import { GraphColor, GraphColorAttributes, GraphColorGroup, GraphEngine, GraphNode, GraphRenderer } from "obsidian-typings";
import { rgb2int } from "src/colors/colors";
import { getBackgroundColor } from "src/helperFunctions";

export class ColorReplacement {
    renderer: GraphRenderer;
    engine: GraphEngine;
    copyColors: Readonly<Record<GraphColor, GraphColorAttributes>>;
    copyColorGroups: Readonly<GraphColorGroup[] | undefined>;

    constructor(renderer: GraphRenderer, engine: GraphEngine) {
        this.renderer = renderer;
        this.engine = engine;
        this.copyColors = Object.freeze(structuredClone(renderer.colors));
        this.copyColorGroups = Object.freeze(structuredClone(engine.options.colorGroups));
    }

    public shortcutColors() {
        const backgroundColor = rgb2int(getBackgroundColor(this.renderer));

        for (const [kStr, color] of Object.entries(this.renderer.colors)) {
            const key = kStr as GraphColor;
            if (key === "arrow" || key === "line" || key ===  "lineHighlight" || key === "text") continue;
            this.renderer.colors[key].rgb = backgroundColor;
        }
    }

    public restoreColors() {
        for (const [kStr, color] of Object.entries(this.renderer.colors)) {
            const key = kStr as GraphColor;
            if (key === "arrow" || key === "line" || key ===  "lineHighlight" || key === "text") continue;
            this.renderer.colors[key].rgb = this.copyColors[key].rgb;
        }
    }

    public getFillColor(node: GraphNode) {
        if (node.renderer.getHighlightNode() === node) {
           return this.copyColors.fillHighlight;
        }
        if ("focused" === node.type) {
            if (this.copyColors.fillFocused.a > 0) {
                //return this.copyColors.fillFocused
            }
        }
        if (node.color)
            return node.color;
        if ("tag" === node.type)
            return this.copyColors.fillTag;
        if ("unresolved" === node.type)
            return this.copyColors.fillUnresolved;
        if ("attachment" === node.type)
            return this.copyColors.fillAttachment
        return this.copyColors.fill
    }
}