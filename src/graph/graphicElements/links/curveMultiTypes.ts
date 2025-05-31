import { IDestroyOptions, Graphics, ColorSource } from "pixi.js";
import { ExtendedGraphLink, InteractiveManager, lengthQuadratic, LinkCurveGraphics, ManagerGraphics, quadratic, tangentQuadratic } from "src/internal";


export class LinkCurveMultiTypesGraphics extends LinkCurveGraphics implements ManagerGraphics {
    updateFrame(): void {
        if (!this.computeMainBezier()) return;

        const renderer = this.extendedLink.coreElement.renderer;
        const link = this.extendedLink.coreElement;

        let arrowColor: ColorSource;
        const thickness = this.extendedLink.getThicknessScale() * renderer.fLineSizeMult / renderer.scale;


        let P0_ = { x: this.bezier.P0.x, y: this.bezier.P0.y };
        let P1 = { x: this.bezier.P1.x, y: this.bezier.P1.y };

        if (this.extendedLink.isHighlighted()) {
            this.lineStyle({ width: thickness, color: "white" });
            this.moveTo(this.bezier.P0.x, this.bezier.P0.y).quadraticCurveTo(this.bezier.P1.x, this.bezier.P1.y, this.bezier.P2.x, this.bezier.P2.y);
            this.tint = (this.extendedLink.coreElement.line?.worldVisible ? this.extendedLink.coreElement.line.tint : this.extendedLink.siblingLink?.coreElement.line?.tint) ?? this.tint;
            arrowColor = this.tint;
        }
        else {
            // Compute one bezier curve for each type
            // with the De Casteljau algorithm, considering the full
            // curbe with control points P0_, P1, P2_.
            const activeTypes = [...this.types].filter(type => this.manager.isActive(type));
            if (activeTypes.length === 1) {
                this.lineStyle({ width: thickness, color: "white" });
                this.moveTo(this.bezier.P0.x, this.bezier.P0.y).quadraticCurveTo(this.bezier.P1.x, this.bezier.P1.y, this.bezier.P2.x, this.bezier.P2.y);
                this.tint = this.color;
                arrowColor = this.tint;
            }
            else if (activeTypes.length > 0) {
                this.tint = "white";
                const step = 1 / activeTypes.length;
                let i = 0;
                this.moveTo(this.bezier.P0.x, this.bezier.P0.y);
                for (const type of activeTypes) {
                    const t = step * (1 + i);
                    const [bezierA, bezierB] = this.deCasteljau([P0_, P1, this.bezier.P2], t);
                    P0_ = bezierB[0];
                    P1 = bezierB[1];

                    // Draw bezierA
                    this.lineStyle({ width: thickness, color: this.manager.getColor(type) });
                    this.quadraticCurveTo(bezierA[1].x, bezierA[1].y, bezierA[2].x, bezierA[2].y);
                    ++i;
                }
                arrowColor = this.manager.getColor(activeTypes[activeTypes.length - 1]);
            }
            else {
                arrowColor = this.tint;
            }
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
                this.arrow.tint = arrowColor;
                this.arrow.position.set(this.bezier.P2.x, this.bezier.P2.y);
                this.arrow.rotation = -Math.atan(-tangentQuadratic(1, P0_, P1, this.bezier.P2).m);
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

    private deCasteljau(points: { x: number, y: number }[], t: number): { x: number, y: number }[][] {
        if (t === 0 || t === 1) {
            return [points, points];
        }

        let bezierA: { x: number, y: number }[] = [];
        let bezierB: { x: number, y: number }[] = [];
        bezierA.push(points[0]);
        bezierB.push(points[points.length - 1]);
        while (points.length > 1) {
            let midpoints: { x: number, y: number }[] = [];
            for (let i = 0; i + 1 < points.length; ++i) {
                let ax = points[i].x;
                let ay = points[i].y;
                let bx = points[i + 1].x;
                let by = points[i + 1].y;
                // a * (1-t) + b * t = a + (b - a) * t
                midpoints.push({
                    x: ax + (bx - ax) * t,
                    y: ay + (by - ay) * t,
                });
            }
            bezierA.push(midpoints[0]);
            bezierB.push(midpoints[midpoints.length - 1]);
            points = midpoints;
        }
        return [bezierA, bezierB.reverse()];
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