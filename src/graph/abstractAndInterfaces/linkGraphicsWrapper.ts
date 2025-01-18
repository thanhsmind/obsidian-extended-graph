import { GraphLink } from "obsidian-typings";
import { ExtendedGraphLink } from "../extendedElements/extendedGraphLink";
import { InteractiveManager } from "../interactiveManager";
import { GraphicsWrapper } from "./graphicsWrapper";
import { ManagerGraphics } from "./managerGraphics";
import { Graphics } from "pixi.js";

export abstract class LinkGraphicsWrapper implements GraphicsWrapper<GraphLink> {
    // Interface instance values
    name: string;
    extendedElement: ExtendedGraphLink;
    managerGraphicsMap?: Map<string, ManagerGraphics>;
    pixiElement: Graphics;


    constructor(extendedElement: ExtendedGraphLink) {
        this.extendedElement = extendedElement;
        this.name = extendedElement.id;
    }

    // ============================= INITALIZATION =============================

    initGraphics(): void {}

    // ============================ CLEAR GRAPHICS =============================

    clearGraphics(): void {
        this.pixiElement.clear();
    }

    destroyGraphics(): void {
        this.pixiElement.destroy();
    }

    // ============================ UPDATE GRAPHICS ============================

    updateGraphics(): void {
        throw new Error('Method not implemented.');
    }

    // ============================ ENABLE/DISABLE =============================
    
    toggleType(type: string, enable: boolean): void {
        this.updateGraphics();
    }

    // ========================== CONNECT/DISCONNECT ===========================

    updateCoreElement(): void {
        const link = this.extendedElement.coreElement;
        if (!link.line) {
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