import { colorAttributes2hex, CSSLinkLabelStyle, ExtendedGraphLink, getBackgroundColor, getLinkLabelStyle, LINK_KEY, LinkCurveGraphics, LinkCurveMultiTypesGraphics, LinkLineMultiTypesGraphics } from "src/internal";
import { ColorSource, Container, Graphics, Sprite, Text, TextStyle, TextStyleFill, Texture } from "pixi.js";

export abstract class LinkText extends Container {
    extendedLink: ExtendedGraphLink;
    background: Graphics | Sprite;
    text: Text;
    textColor?: TextStyleFill | null;
    isRendered: boolean;
    style: CSSLinkLabelStyle;

    constructor(text: string, extendedLink: ExtendedGraphLink) {
        super();
        this.extendedLink = extendedLink;

        this.text = new Text(text);

        this.computeCSSStyle();
        this.text.style = this.getTextStyle();
        this.text.resolution = 2;

        if (this.needsGraphicsBackground()) {
            this.background = new Graphics();
            this.addChild(this.background, this.text);
        }
        else {
            this.background = new Sprite(Texture.WHITE);
            this.addChild(this.background, this.text);
        }

        this.applyCSSChanges();
    }

    private needsGraphicsBackground(): boolean {
        return (this.style.borderWidth > 0 && this.style.borderColor.a > 0) || this.style.radius > 0;
    }

    abstract connect(): void;

    updateFrame(): boolean {
        if (this.destroyed) return false;

        if (!this.isRendered || !this.extendedLink.managers.get(LINK_KEY)?.isActive(this.text.text) || !this.parent) {
            this.visible = false;
            return false;
        }
        this.visible = true;

        if (this.extendedLink.coreElement.source.circle) {
            this.scale.x = this.scale.y = this.extendedLink.coreElement.renderer.nodeScale;
        }

        return true;
    }

    computeCSSStyle() {
        this.style = getLinkLabelStyle(
            this.extendedLink.instances,
            {
                source: this.extendedLink.coreElement.source.id,
                target: this.extendedLink.coreElement.target.id
            });
    }

    getTextStyle(): TextStyle {
        return new TextStyle({
            fontFamily: this.style.textStyle.fontFamily,
            fontStyle: this.style.textStyle.fontStyle,
            fontVariant: this.style.textStyle.fontVariant,
            fontWeight: this.style.textStyle.fontWeight,
            letterSpacing: this.style.textStyle.letterSpacing,
            fontSize: this.style.textStyle.fontSize + this.extendedLink.coreElement.source.getSize() / 4,
            fill: this.getTextColor(),
        });
    }

    private getTextColor(): TextStyleFill {
        if (this.extendedLink.instances.settings.colorLinkTypeLabel) {
            const color = this.extendedLink.managers.get(LINK_KEY)?.getColor(this.text.text);
            if (color) return color;
        }

        if (this.textColor === undefined) { // Undefined means not yet computed
            if (this.style.textStyle.fill) return this.style.textStyle.fill;
        }
        else if (this.textColor !== null) { // Nulls means computed but no value
            return this.textColor;
        }

        // @ts-ignore
        return this.extendedLink.coreElement.renderer.colors.text.rgb;
    }

    setDisplayedText(text: string): void {
        if (this.destroyed) return;
        this.text.text = text;
    }

    updateTextColor() {
        this.text.style.fill = this.getTextColor();
    }

    updateTextBackgroundColor(backgroundColor: ColorSource): void {
        if (this.destroyed) return;
        if (this.background instanceof Sprite) {
            this.background.tint = backgroundColor;
        }
        else {
            this.drawGraphics(backgroundColor);
        }
        this.updateTextColor();
    }

    applyCSSChanges(): void {
        this.text.style = this.getTextStyle();
        this.text.position.set(this.style.padding.left, this.style.padding.top);


        if (this.needsGraphicsBackground()) {
            this.drawGraphics(getBackgroundColor(this.extendedLink.coreElement.renderer));
        }
        else {
            const bgColor = getBackgroundColor(this.extendedLink.coreElement.renderer);
            this.drawSprite(bgColor);
        }

        this.pivot.set(0.5 * this.width / this.scale.x, 0.5 * this.height / this.scale.y);
    }

    private getWidth(): number {
        return this.text.width + this.style.padding.left + this.style.padding.right
    }

    private getHeight(): number {
        return this.text.height + this.style.padding.top + this.style.padding.bottom;
    }

    private drawGraphics(backgroundColor: ColorSource): void {
        if (this.background instanceof Sprite) {
            this.background.removeFromParent();
            this.background.destroy();
            this.background = new Graphics();
            this.addChildAt(this.background, 0);
        }
        this.background.clear();
        const lineColor = this.style.borderColor.a > 0 ? this.style.borderColor.rgb : this.extendedLink.managers.get(LINK_KEY)?.getColor(this.text.text) ?? this.extendedLink.coreElement.renderer.colors.line.rgb;
        if (this.style.backgroundColor.a > 0) {
            backgroundColor = colorAttributes2hex(this.style.backgroundColor);
        }
        this.background.lineStyle(this.style.borderWidth, lineColor, 1, 1)
            .beginFill(backgroundColor)
            .drawRoundedRect(0, 0, this.getWidth(), this.getHeight(), this.style.radius);
    }

    private drawSprite(backgroundColor: ColorSource): void {
        if (this.background instanceof Graphics) {
            this.background.removeFromParent();
            this.background.destroy();
            this.background = new Sprite(Texture.WHITE);
            this.addChildAt(this.background, 0);
        }
        if (this.style.backgroundColor.a > 0) {
            this.background.tint = this.style.backgroundColor.rgb;
            this.background.alpha = this.style.backgroundColor.a;
        }
        else {
            this.background.tint = backgroundColor;
            this.background.alpha = 1;
        }
        this.background.width = this.getWidth();
        this.background.height = this.getHeight();
    }
}

abstract class CurvedLinkText extends LinkText {
    override connect() {
        if (this.destroyed || !this.extendedLink.graphicsWrapper) return;
        this.extendedLink.graphicsWrapper.pixiElement.addChild(this);
        this.alpha = 2;
    }
}

export class LinkTextCurveMultiTypes extends CurvedLinkText {
    override updateFrame(): boolean {
        if (!super.updateFrame() || !this.extendedLink.graphicsWrapper) return false;

        const parent = this.extendedLink.graphicsWrapper.pixiElement as LinkCurveMultiTypesGraphics;
        if (this.text.text in parent.typesPositions) {
            const middle = parent.typesPositions[this.text.text].position;
            this.position.set(middle.x, middle.y);
            return true;
        }
        return false;
    }
}

export class LinkTextCurveSingleType extends CurvedLinkText {
    override updateFrame(): boolean {
        if (!super.updateFrame() || !this.extendedLink.graphicsWrapper) return false;

        const middle = (this.extendedLink.graphicsWrapper.pixiElement as LinkCurveGraphics).getMiddlePoint();
        this.position.set(middle.x, middle.y);
        return true;
    }
}

abstract class LineLinkText extends LinkText {
    override updateFrame(): boolean {
        if (!super.updateFrame()) return false;

        this.visible = this.extendedLink.coreElement.line?.visible ?? false;
        if (this.visible) {
            this.rotation = - this.parent.rotation;
            this.position = this.getPosition();
            this.alpha = this.extendedLink.coreElement.line?.alpha ?? 0;
        }

        return true;
    }

    protected abstract getPosition(): { x: number, y: number };
}

export class LinkTextLineMultiTypes extends LineLinkText {
    override connect() {
        if (this.destroyed) return;
        this.extendedLink.graphicsWrapper?.pixiElement.addChild(this);
    }

    protected override getPosition(): { x: number, y: number } {
        if (this.extendedLink.graphicsWrapper && this.text.text in (this.extendedLink.graphicsWrapper.pixiElement as LinkLineMultiTypesGraphics).typesPositions) {
            return (this.extendedLink.graphicsWrapper.pixiElement as LinkLineMultiTypesGraphics).typesPositions[this.text.text].position;
        }
        else if (this.extendedLink.siblingLink?.graphicsWrapper && this.text.text in (this.extendedLink.siblingLink.graphicsWrapper.pixiElement as LinkLineMultiTypesGraphics).typesPositions) {
            return (this.extendedLink.siblingLink.graphicsWrapper.pixiElement as LinkLineMultiTypesGraphics).typesPositions[this.text.text].position;
        }
        else {
            return { x: this.parent.width * 0.5, y: 0 };
        }
    }
}

export class LinkTextLineSingleType extends LineLinkText {
    override connect() {
        if (this.destroyed) return;
        this.extendedLink.coreElement.px?.addChild(this);
    }

    protected override getPosition(): { x: number, y: number } {
        return { x: this.parent.width * 0.5, y: 0 };
    }
}