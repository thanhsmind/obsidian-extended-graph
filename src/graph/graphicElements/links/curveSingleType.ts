import { ColorSource, IDestroyOptions } from "pixi.js";
import { LinkCurveGraphics, ManagerGraphics, tangentQuadratic } from "src/internal";


export class LinkCurveSingleTypeGraphics extends LinkCurveGraphics implements ManagerGraphics {
    arrowColor?: ColorSource;

    override updateValues(): void {
        this.arrowColor = this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows']
            && this.extendedLink.instances.settings.arrowColorBool
            && this.extendedLink.instances.settings.arrowColor !== ""
            ? this.extendedLink.instances.settings.arrowColor : undefined
        super.updateValues();
    }
    updateFrame(): void {
        if (!this.computeMainBezier()) return;

        const renderer = this.extendedLink.coreElement.renderer;
        const link = this.extendedLink.coreElement;

        this.lineStyle({ width: this.extendedLink.getThicknessScale() * renderer.fLineSizeMult / renderer.scale, color: "white" });
        this.moveTo(this.bezier.P0.x, this.bezier.P0.y).quadraticCurveTo(this.bezier.P1.x, this.bezier.P1.y, this.bezier.P2.x, this.bezier.P2.y);
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

        let arrowAlpha: number = 1;
        if (this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows']
            && this.extendedLink.instances.settings.alwaysOpaqueArrows) {
            if (this.extendedLink.isHighlighted()
                || !this.extendedLink.coreElement.renderer.getHighlightNode()) {
                arrowAlpha = 10;
            }
        }


        // Arrow
        if (link.arrow && link.arrow.visible) {
            if (!this.arrow) {
                this.initArrow();
                if (this.arrow) this.addChild(this.arrow);
            }
            if (this.arrow) {
                this.arrow.tint = this.arrowColor ?? this.tint;
                this.arrow.alpha = arrowAlpha;
                this.arrow.position.set(this.bezier.P2.x, this.bezier.P2.y);
                this.arrow.rotation = -Math.atan(-tangentQuadratic(1, this.bezier.P0, this.bezier.P1, this.bezier.P2).m);
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