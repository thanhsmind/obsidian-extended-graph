import { IDestroyOptions, Graphics } from "pixi.js";
import * as Color from 'src/colors/color-bits';
import { ExtendedGraphLink, hex2int, InteractiveManager, LINK_KEY, LinkArrow, ManagerGraphics, pixiColor2int } from "src/internal";


export class LinkLineMultiTypesGraphics extends Graphics implements ManagerGraphics {
    manager: InteractiveManager;
    types: Set<string>;
    name: string;
    targetAlpha: number;
    color: Color.Color;
    extendedLink: ExtendedGraphLink;
    arrow: LinkArrow | null;
    activeType: string | undefined;

    constructor(manager: InteractiveManager, types: Set<string>, name: string, link: ExtendedGraphLink) {
        super();
        this.manager = manager;
        this.types = types;
        this.name = "line:" + name;
        this.extendedLink = link;
        this.targetAlpha = link.instances.settings.enableFeatures[link.instances.type]['arrows'] && link.instances.settings.opaqueArrowsButKeepFading
            ? 1 : this.extendedLink.instances.renderer.colors.arrow.a;
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
            this.color = pixiColor2int(this.extendedLink.coreElement.line.tint);
        }
        else {
            this.color = this.extendedLink.coreElement.renderer.colors.line.rgb;
        }
        this.redraw();
    }

    private initArrow() {
        if (this.destroyed) return;
        this.arrow = new LinkArrow(this.extendedLink);
        this.addChild(this.arrow);
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
            x: P2.x - f * target.getSize() * dir.x,
            y: P2.y - f * target.getSize() * dir.y,
        }


        let arrowColor: Color.Color | undefined;
        const thickness = this.extendedLink.getThicknessScale() * renderer.fLineSizeMult / renderer.scale;
        if (this.extendedLink.isHighlighted()) {
            this.lineStyle({ width: thickness, color: "white" });
            this.moveTo(P0_.x, P0_.y).lineTo(P2_.x, P2_.y);
            this.tint = (this.extendedLink.coreElement.line?.worldVisible ? this.extendedLink.coreElement.line.tint : this.extendedLink.siblingLink?.coreElement.line?.tint) ?? this.tint;
        }
        else {
            arrowColor = this.color;
            const activeTypes = [...this.types].filter(type => this.manager.isActive(type));
            // We draw the line only if the link has no sibling already drawn
            if (this.extendedLink.firstSibling || !this.extendedLink.siblingLink?.getActiveType(LINK_KEY)) {
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
                if (this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows']
                    && this.extendedLink.instances.settings.arrowColorBool
                    && this.extendedLink.instances.settings.arrowColor !== "") {
                    arrowColor = hex2int(this.extendedLink.instances.settings.arrowColor);
                }
            }
        }

        if (link.line) {
            this.alpha = link.line.alpha;
        }

        // Arrow
        if (link.arrow && link.arrow.visible) {
            if (!this.arrow) {
                this.initArrow();
            }
            if (this.arrow) {
                this.arrow.update(
                    arrowColor ?? this.tint,
                    P2_,
                    -Math.atan(- (P2_.y - P0_.y) / (P2_.x - P0_.x)) + (P0.x > P2_.x ? Math.PI : 0),
                )
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