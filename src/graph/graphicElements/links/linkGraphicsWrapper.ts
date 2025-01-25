import { GraphLink } from "obsidian-typings";
import { ExtendedGraphLink } from "src/graph/extendedElements/extendedGraphLink";
import { InteractiveManager } from "src/graph/interactiveManager";
import { GraphicsWrapper } from "./graphicsWrapper";
import { LinkGraphics } from "./linkGraphics";
import { Container, Graphics } from "pixi.js";

export abstract class LinkGraphicsWrapper<T extends LinkGraphics> implements GraphicsWrapper<GraphLink> {
    // Interface instance values
    name: string;
    extendedElement: ExtendedGraphLink;
    managerGraphicsMap?: Map<string, T>;
    pixiElement: T;

    constructor(extendedElement: ExtendedGraphLink) {
        this.name = extendedElement.id;
        this.extendedElement = extendedElement;
    }

    // ============================= INITALIZATION =============================

    initGraphics(): void {
        this.managerGraphicsMap = new Map<string, T>();
    }

    setManagerGraphics(manager: InteractiveManager, linkGraphics: T) {
        this.managerGraphicsMap?.set(manager.name, linkGraphics);
        this.pixiElement = linkGraphics;
        this.connect();
    }

    abstract createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number): void;

    // ============================ CLEAR GRAPHICS =============================

    clearGraphics(): void {
        this.pixiElement.clear();
    }

    destroyGraphics(): void {
        this.pixiElement.destroy();
    }

    // ============================ UPDATE GRAPHICS ============================

    updateGraphics(): void {
        this.pixiElement.updateGraphics();
    }

    // ========================== CONNECT/DISCONNECT ===========================

    updateCoreElement(): void {
        const link = this.extendedElement.coreElement;
        if (!link.line || !link.px) {
            const newLink = link.renderer.links.find(l => l.source.id === link.source.id && l.target.id === link.target.id);
            if (newLink && link !== newLink) {
                this.disconnect();
                this.extendedElement.coreElement = newLink;
            }
        }
    }

    abstract connect(): void;
    
    disconnect(): void {
        this.pixiElement.removeFromParent();
    }
}