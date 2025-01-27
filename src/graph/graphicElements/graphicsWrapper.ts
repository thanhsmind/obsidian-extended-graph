import { Container, Graphics } from "pixi.js";
import { GraphLink, GraphNode } from "obsidian-typings";
import { ArcsCircle, ExtendedGraphLink, ExtendedGraphNode, InteractiveManager, LinkLineGraphics } from "src/internal";

export interface GraphicsWrapper<T extends GraphNode | GraphLink> {
    name: string;
    extendedElement: ExtendedGraphNode | ExtendedGraphLink;
    managerGraphicsMap?: Map<string, ArcsCircle | LinkLineGraphics>;
    pixiElement: Graphics | Container;
    
    initGraphics(): void;
    createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number): void;
    resetManagerGraphics(manager: InteractiveManager): void;
    clearGraphics(): void;
    destroyGraphics(): void;
    updateGraphics(): void;

    updateCoreElement(): void;
    connect(): void;
    disconnect(): void;
}