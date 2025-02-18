import { Container, Graphics } from "pixi.js";
import { GraphLink, GraphNode } from "obsidian-typings";
import { ExtendedGraphLink, ExtendedGraphNode, ManagerGraphics } from "src/internal";

export interface GraphicsWrapper<T extends GraphNode | GraphLink> {
    name: string;
    extendedElement: ExtendedGraphNode | ExtendedGraphLink;
    managerGraphicsMap?: Map<string, ManagerGraphics>;
    pixiElement: Graphics | Container;
    
    initGraphics(): void;
    clearGraphics(): void;
    destroyGraphics(): void;
    updateGraphics(): void;

    updateCoreElement(): void;
    connect(): void;
    disconnect(): void;
}