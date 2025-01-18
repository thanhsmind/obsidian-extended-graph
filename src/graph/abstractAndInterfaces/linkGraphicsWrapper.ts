import { GraphLink } from "obsidian-typings";
import { ExtendedGraphLink } from "../extendedElements/extendedGraphLink";
import { InteractiveManager } from "../interactiveManager";
import { GraphicsWrapper } from "./graphicsWrapper";
import { ManagerGraphics } from "./managerGraphics";
import { LineLink } from "../graphicElements/lines/line";

export abstract class LinkGraphicsWrapper implements GraphicsWrapper<GraphLink> {
    // Interface instance values
    name: string;
    extendedElement: ExtendedGraphLink;
    pixiElement: LineLink;


    constructor(extendedElement: ExtendedGraphLink) {
        this.name = extendedElement.id;
        this.extendedElement = extendedElement;
    }

    // ============================= INITALIZATION =============================

    initGraphics(): void { }

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