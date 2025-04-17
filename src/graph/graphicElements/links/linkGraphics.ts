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
        this.updateValues();
    }

    clearGraphics(): void {
        this.clear();
        this.destroy({ children: true });
        this.removeFromParent();
    }

    updateValues(): void {
        const type = this.activeType();
        if (!type) return;
        const overrideColor = this.extendedLink.getStrokeColor();
        this.color = overrideColor !== undefined ? int2rgb(overrideColor) : this.manager.getColor(type);

        if (this.extendedLink.isActive) this.redraw();
    }

    protected activeType(): string | undefined {
        return Array.from(this.types.values()).find(t => this.manager.isActive(t));
    }

    protected abstract redraw(): void;

    abstract updateFrame(): void;

    toggleType(type: string, enable: boolean): void { }
}