import { GraphLink } from "obsidian-typings";
import { ExtendedGraphLink, GraphicsWrapper, InteractiveManager, LinkGraphics } from "src/internal";

export abstract class LinkGraphicsWrapper<T extends LinkGraphics> implements GraphicsWrapper<GraphLink> {
    // Interface instance values
    name: string;
    extendedElement: ExtendedGraphLink;
    managerGraphicsMap: Map<string, T>;
    pixiElement: T;

    constructor(extendedElement: ExtendedGraphLink) {
        this.name = extendedElement.id;
        this.extendedElement = extendedElement;
        this.managerGraphicsMap = new Map<string, T>();
    }

    // ============================= INITALIZATION =============================

    initGraphics(): void {
        let layer = 1;
        for (const [key, manager] of this.extendedElement.instances.linksSet.managers) {
            if (!this.extendedElement.instances.settings.interactiveSettings[key].showOnGraph) continue;
            const validTypes = this.extendedElement.getTypes(key);
            this.createManagerGraphics(manager, validTypes, layer);
            layer++;
        }
    }

    protected setManagerGraphics(manager: InteractiveManager, linkGraphics: T) {
        const existingLinkGraphics = this.managerGraphicsMap.get(manager.name);
        if (existingLinkGraphics) {
            if (existingLinkGraphics.parent) existingLinkGraphics.removeFromParent();
            if (!existingLinkGraphics.destroyed) existingLinkGraphics.destroy({ children: true });
        }
        this.managerGraphicsMap.set(manager.name, linkGraphics);
        this.pixiElement = linkGraphics;
        this.connect();
    }

    protected abstract createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number): void;
    resetManagerGraphics(manager: InteractiveManager): void { }

    // ============================ CLEAR GRAPHICS =============================

    clearGraphics(): void {
        this.pixiElement.clear();
    }

    destroyGraphics(): void {
        this.pixiElement.destroy({ children: true });
    }

    // ============================ UPDATE GRAPHICS ============================

    updateGraphics(): void {
        this.pixiElement?.updateValues();
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
        this.pixiElement?.removeFromParent();
    }
}