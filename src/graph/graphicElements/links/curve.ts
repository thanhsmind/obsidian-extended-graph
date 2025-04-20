import { IDestroyOptions, Graphics } from "pixi.js";
import { ExtendedGraphLink, int2rgb, InteractiveManager, lengthQuadratic, ManagerGraphics, NodeShape, quadratic, tangentQuadratic } from "src/internal";


export class LinkCurveGraphics extends Graphics implements ManagerGraphics {
    manager: InteractiveManager;
    types: Set<string>;
    name: string;
    targetAlpha: number = 0.6;
    color: Uint8Array;
    extendedLink: ExtendedGraphLink;
    arrow: Graphics | null;
    activeType: string | undefined;

    constructor(manager: InteractiveManager, types: Set<string>, name: string, link: ExtendedGraphLink) {
        super();
        this.manager = manager;
        this.types = types;
        this.name = "curve:" + name;
        this.extendedLink = link;
        this.updateValues();
    }

    updateValues(): void {
        this.activeType = this.extendedLink.getActiveType(this.manager.name);
        if (!this.activeType) return;
        const overrideColor = this.extendedLink.getStrokeColor();
        this.color = overrideColor !== undefined ? int2rgb(overrideColor) : this.manager.getColor(this.activeType);
        this.redraw();
    }

    private initArrow() {
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

    updateFrame(): void {
        if (this.destroyed) return;

        this.clear();
        const renderer = this.extendedLink.coreElement.renderer;
        const link = this.extendedLink.coreElement;

        const inverted = this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows'] && this.extendedLink.instances.settings.invertArrows;
        const target = inverted ? link.source : link.target;
        const source = inverted ? link.target : link.source;

        const f = renderer.nodeScale;
        const dx = target.x - source.x;
        const dy = target.y - source.y;

        const P0 = { x: source.x, y: source.y }; // Center of source
        const P2 = { x: target.x, y: target.y }; // Center ot target
        const P1 = { // Control point, shifted along the normal
            x: (P0.x + P2.x) * 0.5 + dy * 0.2,
            y: (P0.y + P2.y) * 0.5 - dx * 0.2
        };

        const L = lengthQuadratic(1, P0, P1, P2); // length of the arc between centers
        const P0_ = quadratic(0.9 * source.getSize() * f / L, P0, P1, P2); // point on the border of the source node, along the arc.
        const P2_ = quadratic(1 - 0.9 * target.getSize() * f / L, P0, P1, P2); // point on the border of the target node, along the arc

        this.lineStyle({ width: this.extendedLink.getThicknessScale() * renderer.fLineSizeMult / renderer.scale, color: "white" });
        this.moveTo(P0_.x, P0_.y).quadraticCurveTo(P1.x, P1.y, P2_.x, P2_.y);
        if (this.extendedLink.isHighlighted()) {
            this.tint = (this.extendedLink.coreElement.line?.worldVisible ? this.extendedLink.coreElement.line.tint : this.extendedLink.siblingLink?.coreElement.line?.tint) ?? this.tint;
        }
        else {
            this.tint = this.color;
        }
        if (link.line) {
            this.alpha = link.line.alpha + this.targetAlpha;
            link.line.alpha = -0.2;
        }

        // Arrow
        if (link.arrow && link.arrow.visible) {
            if (!this.arrow) {
                this.initArrow();
                if (this.arrow) this.addChild(this.arrow);
            }
            if (this.arrow) {
                this.arrow.tint = this.tint;
                this.arrow.position.set(P2_.x, P2_.y);
                this.arrow.rotation = -Math.atan(-tangentQuadratic(1, P0_, P1, P2_).m);
                if (P1.x > P2_.x) {
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

    toggleType(type: string, enable: boolean): void { }
}