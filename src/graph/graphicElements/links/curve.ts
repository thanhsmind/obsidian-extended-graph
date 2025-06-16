import { IDestroyOptions, Graphics, ColorSource } from "pixi.js";
import { ExtendedGraphLink, InteractiveManager, lengthQuadratic, ManagerGraphics, quadratic, tangentQuadratic } from "src/internal";


export abstract class LinkCurveGraphics extends Graphics implements ManagerGraphics {
    manager: InteractiveManager;
    types: Set<string>;
    name: string;
    color: ColorSource;
    extendedLink: ExtendedGraphLink;
    arrow: Graphics | null;
    activeType: string | undefined;
    bezier: { P0: { x: number, y: number }, P1: { x: number, y: number }, P2: { x: number, y: number } };

    constructor(manager: InteractiveManager, types: Set<string>, name: string, link: ExtendedGraphLink) {
        super();
        this.manager = manager;
        this.types = types;
        this.name = "curve:" + name;
        this.extendedLink = link;
        this.bezier = {
            P0: { x: 0, y: 0 }, // Center of source
            P1: { x: 0, y: 0 }, // Control point, shifted along the normal
            P2: { x: 0, y: 0 } // Center of target
        };
        this.updateValues();
    }

    updateValues(): void {
        this.activeType = this.extendedLink.getActiveType(this.manager.name);
        if (!this.activeType) return;
        const overrideColor = this.extendedLink.getStrokeColor();
        if (overrideColor !== undefined) {
            this.color = overrideColor;
        }
        else if (this.extendedLink.instances.settings.interactiveSettings[this.manager.name].showOnGraph) {
            this.color = this.manager.getColor(this.activeType);
        }
        else if (this.extendedLink.coreElement.line) {
            this.color = this.extendedLink.coreElement.line.tint
        }
        else {
            this.color = this.extendedLink.coreElement.renderer.colors.line.rgb;
        }
        this.redraw();
    }

    protected initArrow() {
        if (this.destroyed) return;

        this.arrow = new Graphics();
        this.arrow.beginFill("white");
        this.arrow.moveTo(0, 0);
        this.arrow.lineTo(-4, -2);
        if (!this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows'] || !this.extendedLink.instances.settings.flatArrows) {
            this.arrow.lineTo(-3, 0);
        }
        this.arrow.lineTo(-4, 2);
        this.arrow.lineTo(0, 0);
        this.arrow.endFill();
        this.arrow.name = "arrow";
        this.arrow.eventMode = "none";
        this.arrow.zIndex = 1;
        this.arrow.pivot.set(0, 0);
        this.arrow.alpha = this.extendedLink.coreElement.renderer.colors.arrow.a;
        if (this.extendedLink.coreElement.arrow) this.extendedLink.coreElement.arrow.renderable = false;
    }

    protected redraw(): void {
        if (!this.activeType && this.arrow) {
            this.arrow.clear();
            this.arrow.destroy();
            this.arrow = null;
        }
        this.updateFrame();
    }

    protected computeMainBezier(): boolean {
        if (this.destroyed) return false;

        this.clear();
        const renderer = this.extendedLink.coreElement.renderer;
        const link = this.extendedLink.coreElement;

        const inverted = this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows'] && this.extendedLink.instances.settings.invertArrows;
        const target = inverted ? link.source : link.target;
        const source = inverted ? link.target : link.source;

        if (!target.circle || !source.circle) {
            this.destroy();
            this.extendedLink.disable();
            return false;
        }

        const f = renderer.nodeScale;
        const dx = target.x - source.x;
        const dy = target.y - source.y;

        this.bezier.P1 = { // Control point, shifted along the normal
            x: (source.x + target.x) * 0.5 + dy * 0.2,
            y: (source.y + target.y) * 0.5 - dx * 0.2
        };

        const L = lengthQuadratic(1, source, this.bezier.P1, target); // length of the arc between centers
        this.bezier.P0 = quadratic(0.9 * source.getSize() * f / L, source, this.bezier.P1, target); // point on the border of the source node, along the arc.
        this.bezier.P2 = quadratic(1 - 0.9 * target.getSize() * f / L, source, this.bezier.P1, target); // point on the border of the target node, along the arc

        return true;
    }

    getMiddlePoint() {
        return quadratic(0.5, this.bezier.P0, this.bezier.P1, this.bezier.P2);
    }

    updateFrame(): boolean {
        if (!this.computeMainBezier()) return false;

        const link = this.extendedLink.coreElement;
        if (link.line) {
            this.alpha = link.line.alpha;
        }

        return true;
    }

    protected updateArrow(color: ColorSource, rotation: number) {
        const renderer = this.extendedLink.coreElement.renderer;
        const link = this.extendedLink.coreElement;
        if (link.arrow && link.arrow.visible) {
            let arrowAlpha: number = 1;
            if (this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows']
                && this.extendedLink.instances.settings.alwaysOpaqueArrows) {
                if (this.extendedLink.isHighlighted()
                    || !this.extendedLink.coreElement.renderer.getHighlightNode()) {
                    arrowAlpha = 10;
                }
            }

            if (!this.arrow) {
                this.initArrow();
                if (this.arrow) this.addChild(this.arrow);
            }
            if (this.arrow) {
                this.arrow.tint = color;
                this.arrow.alpha = arrowAlpha;
                this.arrow.position.set(this.bezier.P2.x, this.bezier.P2.y);
                this.arrow.rotation = rotation;
                if (this.bezier.P1.x > this.bezier.P2.x) {
                    this.arrow.rotation += Math.PI;
                }
                this.arrow.scale.set(2 * Math.sqrt(renderer.fLineSizeMult) / renderer.scale);
            }
        }
        else {
            this.arrow?.removeFromParent();
            this.arrow?.clear();
            this.arrow?.destroy();
            this.arrow = null;
        }

    }

    override destroy(options?: IDestroyOptions): void {
        if (this.extendedLink.coreElement.arrow) this.extendedLink.coreElement.arrow.renderable = true;

        if (this.destroyed) return;
        super.destroy(options);
    }

    clearGraphics(): void {
        if (this.destroyed) return;

        this.arrow?.clear();
        this.clear();
        this.destroy({ children: true });
        this.removeFromParent();
    }

    override clear(): this {
        if (this.destroyed) return this;
        return super.clear();
    }

    toggleType(type: string, enable: boolean): void {
        this.updateValues();
    }
}