import { Container, Graphics } from "pixi.js";
import { ExtendedGraphElement } from "./extendedGraphElement";
import { GraphLink, GraphNode } from "obsidian-typings";
import { ManagerGraphics } from "./managerGraphics";

export interface GraphicsWrapper<T extends GraphNode | GraphLink> {
    name: string;
    extendedElement: ExtendedGraphElement<T>;
    managerGraphicsMap?: Map<string, ManagerGraphics>;
    pixiElement: Graphics | Container;

    toggleType(type: string, enable: boolean): void
    
    initGraphics(): void;
    clearGraphics(): void;
    destroyGraphics(): void;
    updateGraphics(): void;

    updateCoreElement(): void;
    connect(): void;
    disconnect(): void;
}