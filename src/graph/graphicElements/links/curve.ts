import { IDestroyOptions, Graphics } from "pixi.js";
import { ExtendedGraphLink, InteractiveManager, lengthQuadratic, LinkGraphics, ManagerGraphics, NodeShape, quadratic, tangentQuadratic } from "src/internal";


export class LinkCurveGraphics extends LinkGraphics {
    arrow: Graphics | null;

    constructor(manager: InteractiveManager, types: Set<string>, name: string, link: ExtendedGraphLink) {
        super(manager, types, name, link);
        this.name = "curve:" + this.name;

        this.updateGraphics();
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

    override toggleType(type: string, enable: boolean): void {
        if (this.destroyed) return;

        if (!enable && this.arrow) {
            this.arrow.clear();
            this.arrow.destroy();
            this.arrow = null;
        }
        super.toggleType(type, enable);
    }

    redrawType(type: string, color?: Uint8Array): void {
        if (this.destroyed) return;

        super.redrawType(type, color);
        this.updateFrame();
    }

    override updateFrame(): void {
        if (this.destroyed) return;

        this.clear();
        const renderer = this.extendedLink.coreElement.renderer;
        const link = this.extendedLink.coreElement;

        const f = renderer.nodeScale;
        const dx = link.target.x - link.source.x;
        const dy = link.target.y - link.source.y;

        const P0 = { x: link.source.x, y: link.source.y }; // Center of source
        const P2 = { x: link.target.x, y: link.target.y }; // Center ot target
        const P1 = { // Control point, shifted along the normal
            x: (P0.x + P2.x) * 0.5 + dy * 0.2,
            y: (P0.y + P2.y) * 0.5 - dx * 0.2
        };

        const L = lengthQuadratic(1, P0, P1, P2); // length of the arc between centers
        const P0_ = quadratic(0.9 * link.source.getSize() * f / L, P0, P1, P2); // point on the border of the source node, along the arc.
        const P2_ = quadratic(1 - 0.9 * link.target.getSize() * f / L, P0, P1, P2); // point on the border of the target node, along the arc

        this.lineStyle({ width: this.extendedLink.getThicknessScale() * renderer.fLineSizeMult / renderer.scale, color: "white" });
        this.moveTo(P0_.x, P0_.y).quadraticCurveTo(P1.x, P1.y, P2_.x, P2_.y);
        if (link.line && link.line.tint !== renderer.colors.line.rgb) {
            this.tint = link.line.tint;
        }
        this.tint = this.color;
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

    override clearGraphics(): void {
        if (this.destroyed) return;

        this.arrow?.clear();
        super.clearGraphics();
    }

    override clear(): this {
        if (this.destroyed) return this;
        return super.clear();
    }
}