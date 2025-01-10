import { GraphRenderer } from "./renderer";
import { GraphEngine } from "./engine";
import { GraphView, LocalGraphView } from "obsidian-typings";

export type GraphViewExt = GraphView & {
    renderer: GraphRenderer;
    dataEngine: GraphEngine;
}

export type LocalGraphViewExt = LocalGraphView & {
    renderer: GraphRenderer;
    engine: GraphEngine;
}