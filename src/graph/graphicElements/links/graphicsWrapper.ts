import { Container, Graphics } from "pixi.js";
import { GraphLink, GraphNode } from "obsidian-typings";
import { ExtendedGraphNode } from "src/graph/extendedElements/extendedGraphNode";
import { ExtendedGraphLink } from "src/graph/extendedElements/extendedGraphLink";
import { InteractiveManager } from "src/graph/interactiveManager";
import { ArcsCircle } from "../nodes/arcsCircle";
import { LinkLineGraphics } from "./line";

export interface GraphicsWrapper<T extends GraphNode | GraphLink> {
    name: string;
    extendedElement: ExtendedGraphNode | ExtendedGraphLink;
    managerGraphicsMap?: Map<string, ArcsCircle | LinkLineGraphics>;
    pixiElement: Graphics | Container;
    
    initGraphics(): void;
    createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number): void;
    clearGraphics(): void;
    destroyGraphics(): void;
    updateGraphics(): void;

    updateCoreElement(): void;
    connect(): void;
    disconnect(): void;
}