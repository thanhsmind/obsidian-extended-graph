import { Container, Graphics } from "pixi.js";
import { GraphRenderer } from "./renderer";
import { GraphNode } from "./node";

export interface GraphLink {
    /**
     * Destroy the graphics and its children, and remove them from the scene
     * @internal
     */
    clearGraphics(): void;
    /**
     * Initialize the link (line and arrow), and add them to the scene
     * @internal
     */
    initGraphics(): void;

    /** @internal */
    arrow: Graphics;
    /** @internal */
    line: Graphics;
    /** @internal */
    px: Container;
    /** @internal */
    rendered: boolean;
    /** @internal */
    renderer: GraphRenderer;
    /** @internal */
    source: GraphNode;
    /** @internal */
    target: GraphNode;
}