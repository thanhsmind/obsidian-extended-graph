import { GraphLink } from "obsidian-typings";
import { ExtendedGraphLink, GraphicsWrapper, InteractiveManager, LinkGraphics } from "src/internal";

export abstract class LinkGraphicsWrapper<T extends LinkGraphics> implements GraphicsWrapper {
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

    createGraphics(): void {
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
        if (existingLinkGraphics && existingLinkGraphics !== linkGraphics) {
            if (existingLinkGraphics.parent) existingLinkGraphics.removeFromParent();
            if (!existingLinkGraphics.destroyed) existingLinkGraphics.destroy({ children: true });
        }
        this.managerGraphicsMap.set(manager.name, linkGraphics);
        this.pixiElement = linkGraphics;
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

    abstract connect(): void;

    disconnect(): void {
        this.pixiElement?.removeFromParent();
    }
}