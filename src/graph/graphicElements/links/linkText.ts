import { CSSTextStyle, ExtendedGraphLink, getBackgroundColor, getLinkTextStyle, LinkCurveGraphics } from "src/internal";
import { ColorSource, Container, Sprite, Text, TextStyle, Texture } from "pixi.js";

export class LinkText extends Container {
    extendedLink: ExtendedGraphLink;
    sprite: Sprite;
    text: Text;
    onCurve: boolean;

    constructor(text: string, extendedLink: ExtendedGraphLink) {
        super();
        this.extendedLink = extendedLink;
        this.text = new Text(text, this.getTextStyle());
        this.sprite = new Sprite(Texture.WHITE);
        this.sprite.tint = getBackgroundColor(this.extendedLink.coreElement.renderer);
        this.sprite.width = this.text.width;
        this.sprite.height = this.text.height;
        this.addChild(this.sprite, this.text);
        this.pivot.set(0.5 * this.width / this.scale.x, 0.5 * this.height / this.scale.y);
    }

    connect() {
        if (this.destroyed) return;
        if (this.extendedLink.graphicsWrapper?.pixiElement instanceof LinkCurveGraphics) {
            this.onCurve = true;
            this.extendedLink.graphicsWrapper.pixiElement.addChild(this);
            this.alpha = 2;
        }
        else if (this.extendedLink.coreElement.px) {
            this.extendedLink.coreElement.px.addChild(this);
        }
    }

    updateFrame() {
        if (this.destroyed) return;
        if (this.onCurve) {
            if (this.extendedLink.coreElement.source.circle) {
                this.scale.x = this.scale.y = this.extendedLink.coreElement.renderer.nodeScale;
            }
            const middle = (this.extendedLink.graphicsWrapper?.pixiElement as LinkCurveGraphics).getMiddlePoint();
            this.position.set(middle.x, middle.y);
        }
        else {
            this.visible = this.extendedLink.coreElement.line?.visible ?? false;
            if (this.visible) {
                this.rotation = - this.parent.rotation;
                if (this.extendedLink.coreElement.source.circle) {
                    this.scale.x = this.scale.y = this.extendedLink.coreElement.renderer.nodeScale;
                }
                this.position.x = this.parent.width * 0.5;
                this.alpha = this.extendedLink.coreElement.line?.alpha ?? 0;
            }
        }
    }

    getCSSStyle(): CSSTextStyle {
        const style = getLinkTextStyle(
            this.extendedLink.instances,
            {
                source: this.extendedLink.coreElement.source.id,
                target: this.extendedLink.coreElement.target.id
            });
        return style;
    }

    getTextStyle(): TextStyle {
        const customStyle = this.getCSSStyle();
        return new TextStyle({
            fontFamily: customStyle.fontFamily,
            fontStyle: customStyle.fontStyle,
            fontVariant: customStyle.fontVariant,
            fontWeight: customStyle.fontWeight,
            letterSpacing: customStyle.letterSpacing,
            fontSize: customStyle.fontSize + this.extendedLink.coreElement.source.getSize() / 4,
            // @ts-ignore
            fill: customStyle.fill ?? this.extendedLink.coreElement.renderer.colors.text.rgb,
        });
    }

    setDisplayedText(text: string): void {
        if (this.destroyed) return;
        this.text.text = text;
    }

    updateTextBackgroundColor(backgroundColor: ColorSource): void {
        if (this.destroyed) return;
        this.sprite.tint = backgroundColor;
        // @ts-ignore
        this.text.style.fill = this.getCSSStyle().fill ?? this.extendedLink.coreElement.renderer.colors.text.rgb;
    }
}