import { Graphics } from "pixi.js";
import { ExtendedGraphLink, InteractiveManager, ManagerGraphics } from "src/internal";

export abstract class LinkGraphics extends Graphics implements ManagerGraphics {
    // Instance values
    manager: InteractiveManager;
    types: Set<string>;
    name: string;
    targetAlpha: number = 0.6;
    color: Uint8Array;
    extendedLink: ExtendedGraphLink;

    constructor(manager: InteractiveManager, types: Set<string>, name: string, link: ExtendedGraphLink) {
        super();
        this.manager = manager;
        this.types = types;
        this.name = name;
        this.extendedLink = link;
    }

    clearGraphics(): void {
        this.clear();
        this.destroy({children: true});
        this.removeFromParent();
    }

    initGraphics(): void {

    }

    updateGraphics(): void {
        const type = Array.from(this.types.values()).find(t => this.manager.isActive(t));
        if (!type) return;
        this.color = this.manager.getColor(type);
        this.redrawType(type);
    }

    abstract redrawType(type: string, color?: Uint8Array): void;

    toggleType(type: string, enable: boolean): void {
        this.clear();
        this.updateGraphics();
    }
}