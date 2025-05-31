import { IDestroyOptions, Graphics, ColorSource } from "pixi.js";
import { ExtendedGraphLink, InteractiveManager, lengthQuadratic, LINK_KEY, ManagerGraphics, quadratic, tangentQuadratic } from "src/internal";


export class LinkLineMultiTypesGraphics extends Graphics implements ManagerGraphics {
    manager: InteractiveManager;
    types: Set<string>;
    name: string;
    targetAlpha: number;
    color: ColorSource;
    extendedLink: ExtendedGraphLink;
    arrow: Graphics | null;
    activeType: string | undefined;

    constructor(manager: InteractiveManager, types: Set<string>, name: string, link: ExtendedGraphLink) {
        super();
        this.manager = manager;
        this.types = types;
        this.name = "line:" + name;
        this.extendedLink = link;
        this.targetAlpha = link.instances.settings.enableFeatures[link.instances.type]['arrows'] && link.instances.settings.opaqueArrowsButKeepFading ? 1 : 0.6;
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

    updateFrame(): void {
        if (this.destroyed) return;

        this.clear();
        if (!this.activeType) {
            this.arrow?.clear();
            return;
        }

        const renderer = this.extendedLink.coreElement.renderer;
        const link = this.extendedLink.coreElement;

        const inverted = this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows'] && this.extendedLink.instances.settings.invertArrows;
        const target = inverted ? link.source : link.target;
        const source = inverted ? link.target : link.source;

        if (!target.circle || !source.circle) {
            this.destroy();
            this.extendedLink.disable();
            return;
        }

        const f = renderer.nodeScale;

        const P0 = { x: source.x, y: source.y }; // Center of source
        const P2 = { x: target.x, y: target.y }; // Center ot target
        const dir = { x: P2.x - P0.x, y: P2.y - P0.y }; // Direction vector
        // Normalize the direction vector
        const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
        dir.x /= length;
        dir.y /= length;

        let P0_ = { // point on the border of the source node, along the line
            x: P0.x + f * source.getSize() * dir.x,
            y: P0.y + f * source.getSize() * dir.y,
        }
        let P2_ = { // point on the border of the target node, along the line
            x: P2.x - f * source.getSize() * dir.x,
            y: P2.y - f * source.getSize() * dir.y,
        }


        let arrowColor: ColorSource;
        const thickness = this.extendedLink.getThicknessScale() * renderer.fLineSizeMult / renderer.scale;
        if (this.extendedLink.isHighlighted()) {
            this.lineStyle({ width: thickness, color: "white" });
            this.moveTo(P0_.x, P0_.y).lineTo(P2_.x, P2_.y);
            this.tint = (this.extendedLink.coreElement.line?.worldVisible ? this.extendedLink.coreElement.line.tint : this.extendedLink.siblingLink?.coreElement.line?.tint) ?? this.tint;
            arrowColor = this.tint;
        }
        else {
            const activeTypes = [...this.types].filter(type => this.manager.isActive(type));
            // If the link has a sibling already drawn, we don't draw this line but we still select the correct arrow color
            if (!this.extendedLink.firstSibling && this.extendedLink.siblingLink?.getActiveType(LINK_KEY)) {
                arrowColor = this.color;
            }
            else {
                // If the link has a sibling link, we concatenate its active types
                if (this.extendedLink.siblingLink) {
                    const siblingActiveTypes = [...this.extendedLink.siblingLink.types.get(LINK_KEY) ?? []].filter(type => this.manager.isActive(type));
                    for (const type of siblingActiveTypes) {
                        if (!activeTypes.includes(type)) {
                            activeTypes.unshift(type);
                        }
                    }
                }
                // If there is only one active type, we draw a single line
                if (activeTypes.length === 1) {
                    this.lineStyle({ width: thickness, color: "white" });
                    this.moveTo(P0_.x, P0_.y).lineTo(P2_.x, P2_.y);
                    this.tint = this.color;
                    arrowColor = this.tint;
                }
                else if (activeTypes.length > 0) {
                    this.tint = "white";
                    // length of the line
                    const step = 1 / activeTypes.length;
                    let i = 0;
                    this.moveTo(P0_.x, P0_.y);
                    for (const type of activeTypes) {
                        const t = step * (1 + i);

                        this.lineStyle({ width: thickness, color: this.manager.getColor(type) });
                        this.lineTo(
                            (1 - t) * P0_.x + t * P2_.x,
                            (1 - t) * P0_.y + t * P2_.y
                        );
                        ++i;
                    }
                    arrowColor = this.manager.getColor(activeTypes[activeTypes.length - 1]);
                }
                else {
                    arrowColor = this.tint;
                }
            }
        }

        if (this.extendedLink.instances.settings.arrowColorBool
            && this.extendedLink.instances.settings.arrowColor !== "") {
            arrowColor = this.extendedLink.instances.settings.arrowColor;
        }

        let arrowAlpha: number = 1;
        if (this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows']
            && this.extendedLink.instances.settings.alwaysOpaqueArrows) {
            if (this.extendedLink.isHighlighted()
                || !this.extendedLink.coreElement.renderer.getHighlightNode()) {
                arrowAlpha = 10;
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
                this.arrow.alpha = arrowAlpha;
                this.arrow.position.set(P2_.x, P2_.y);
                this.arrow.rotation = -Math.atan(- (P2_.y - P0_.y) / (P2_.x - P0_.x));
                if (P0.x > P2_.x) {
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