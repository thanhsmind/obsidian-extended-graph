import { Graphics } from "pixi.js";
import { ExtendedGraphLink, int2rgb, InteractiveManager, ManagerGraphics } from "src/internal";

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
        const type = this.activeType();
        if (!type) return;
        const overrideColor = this.extendedLink.getStrokeColor();
        this.color = overrideColor !== undefined ? int2rgb(overrideColor) : this.manager.getColor(type);
        console.log(type, overrideColor);
    }

    updateGraphics(): void {
        const type = this.activeType();
        if (!type) return;
        const overrideColor = this.extendedLink.getStrokeColor();
        this.color = overrideColor !== undefined ? int2rgb(overrideColor) : this.manager.getColor(type);
        if (this.extendedLink.isActive) this.redrawType(type);
    }

    protected activeType(): string | undefined {
        return Array.from(this.types.values()).find(t => this.manager.isActive(t));
    }

    redrawType(type: string, color?: Uint8Array): void {
        const overrideColor = this.extendedLink.getStrokeColor();
        this.color = overrideColor !== undefined ? int2rgb(overrideColor) : color ?? this.manager.getColor(type);
    }
    
    abstract updateFrame(): void;

    toggleType(type: string, enable: boolean): void {
        this.clear();
        if (enable) {
            this.redrawType(type);
        }
    }
}