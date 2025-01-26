import { GraphLink } from "obsidian-typings";
import { Graphics, IDestroyOptions } from "pixi.js";
import { InteractiveManager, lengthQuadratic, LinkGraphics, ManagerGraphics, NodeShape, quadratic, tangentQuadratic } from "src/internal";


export class LinkCurveGraphics extends LinkGraphics implements ManagerGraphics {
    link: GraphLink;
    arrow: Graphics | null;

    constructor(manager: InteractiveManager, types: Set<string>, name: string, link: GraphLink) {
        super(manager, types, name);
        this.name = "curve:" + this.name;
        this.link = link;

        this.updateGraphics();
    }

    private initArrow() {
        this.arrow = new Graphics();
        this.arrow.beginFill("white");
        this.arrow.moveTo(0, 0);
        this.arrow.lineTo(-4, -2);
        this.arrow.lineTo(-3,  0);
        this.arrow.lineTo(-4,  2);
        this.arrow.lineTo(0, 0);
        this.arrow.endFill();
        this.arrow.name = "arrow";
        this.arrow.eventMode = "none";
        this.arrow.zIndex = 1;
        this.arrow.pivot.set(0, 0);
        if(this.link.arrow) this.link.arrow.renderable = false;
    }

    redrawType(type: string, color?: Uint8Array): void {
        this.clear();
        const renderer = this.link.renderer;
        
        const f = renderer.nodeScale;
        const dx = this.link.target.x - this.link.source.x;
        const dy = this.link.target.y - this.link.source.y;

        const P0 = { x: this.link.source.x, y: this.link.source.y }; // Center of source
        const P2 = { x: this.link.target.x, y: this.link.target.y }; // Center ot target
        const P1 = { // Control point, shifted along the normal
            x: (P0.x + P2.x) * 0.5 + dy * 0.2,
            y: (P0.y + P2.y) * 0.5 - dx * 0.2
        };

        const L = lengthQuadratic(1, P0, P1, P2); // length of the arc between centers
        const P0_ = quadratic(   0.9 * this.link.source.getSize() * f / L, P0, P1, P2); // point on the border of the source node, along the arc.
        const P2_ = quadratic(1- 0.9 * this.link.target.getSize() * f / L, P0, P1, P2); // point on the border of the target node, along the arc

        this.lineStyle({width: renderer.fLineSizeMult / renderer.scale, color: "white"});
        this.moveTo(P0_.x, P0_.y).quadraticCurveTo(P1.x, P1.y, P2_.x, P2_.y);
        if (this.link.line && this.link.line.tint !== renderer.colors.line.rgb) {
            this.tint = this.link.line.tint;
        }
        else if (color) {
            this.tint = color;
        }
        else {
            this.tint = this.color;
        }
        if (this.link.line) {
            this.alpha = this.link.line.alpha + this.targetAlpha;
            this.link.line.alpha = -0.2;
        }

        // Arrow
        if (this.link.arrow && this.link.arrow.visible) {
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

    override destroy(options?: IDestroyOptions | boolean): void {
        if (this.link.arrow) this.link.arrow.renderable = true;
        super.destroy(options);
    }
}