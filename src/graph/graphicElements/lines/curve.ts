import { ManagerGraphics } from "src/graph/abstractAndInterfaces/managerGraphics";
import { LinkGraphics } from "./linkGraphics";
import { InteractiveManager } from "src/graph/interactiveManager";
import { GraphLink } from "obsidian-typings";
import { lengthQuadratic, quadratic } from "src/helperFunctions";

export class LinkCurveGraphics extends LinkGraphics implements ManagerGraphics {
    readonly link: GraphLink;

    constructor(manager: InteractiveManager, types: Set<string>, name: string, link: GraphLink) {
        super(manager, types, name);
        this.link = link;

        this.updateGraphics();
    }

    redrawType(type: string, color?: Uint8Array): void {
        this.clear();
        const renderer = this.link.renderer;
        
        const f = renderer.nodeScale;
        const w = this.link.px.width;
        const h = this.link.px.height * renderer.scale;
        const sr = this.link.source.getSize() * f;
        const tr = this.link.target.getSize() * f;

        const P0 = { x: 0 - sr, y: 0 };
        const P3 = { x: w + tr, y: 0 };
        const W = P3.x - P0.x;
        const P1 = { x: W * 1/2, y: w / 4 };
        //const P2 = { x: W * 2/3, y: P1.y };

        const L = lengthQuadratic(1, P0, P1, P3);
        const P0_ = quadratic(0.8*sr/L, P0, P1, P3);
        const P3_ = quadratic(1-1.2*tr/L, P0, P1, P3);
        const W_ = P3_.x - P0_.x;
        const P1_ = { x: W_ * 1/2, y: W_ / 4 };
        //const P2_ = { x: W_ * 2/3, y: P1_.y };

        // Straight line from center to center
        //this.lineStyle({width: h / 2, color: "green"});
        //this.moveTo(P0.x, P0.y).lineTo(P3.x, P3.y);
        // Bezie curve from center to center
        //this.lineStyle({width: h / 2, color: "red"});
        //this.moveTo(P0.x, P0.y).quadraticCurveTo(P1.x, P1.y, P3.x, P3.y);
        // Expected final Bezier curve
        this.lineStyle({width: h, color: "white"});
        this.moveTo(P0_.x, P0_.y).quadraticCurveTo(P1_.x, P1_.y, P3_.x, P3_.y);
        // Circle at the source
        //this.lineStyle({width: 1, color: "cyan"});
        //this.drawCircle(P0_.x, P0_.y, 5);
        this.alpha = 1;
        if (this.link.line.tint !== renderer.colors.line.rgb) {
            this.tint = this.link.line.tint;
        }
        else {
            this.tint = this.manager.getColor(type);
        }
        this.alpha = this.link.line.alpha + this.targetAlpha;
        this.link.line.alpha = -0.2;
    }
}