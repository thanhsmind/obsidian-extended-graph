import { Container, Graphics } from "pixi.js";
import { GraphLink, GraphNode } from "obsidian-typings";
import { ExtendedGraphNode } from "../extendedElements/extendedGraphNode";
import { ExtendedGraphLink } from "../extendedElements/extendedGraphLink";
import { ArcsCircle } from "../graphicElements/nodes/arcsCircle";
import { LineLink } from "../graphicElements/lines/line";
import { InteractiveManager } from "../interactiveManager";

export interface GraphicsWrapper<T extends GraphNode | GraphLink> {
    name: string;
    extendedElement: ExtendedGraphNode | ExtendedGraphLink;
    managerGraphicsMap?: Map<string, ArcsCircle | LineLink>;
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