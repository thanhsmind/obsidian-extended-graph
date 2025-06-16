import { CSSTextStyle, ExtendedGraphLink, getBackgroundColor, getLinkTextStyle, LinkCurveGraphics } from "src/internal";
import { ColorSource, Container, Sprite, Text, TextStyle, Texture } from "pixi.js";

export class LinkText extends Container {
    extendedLink: ExtendedGraphLink;
    sprite: Sprite;
    text: Text;

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
        this.y = this.extendedLink.graphicsWrapper?.pixiElement instanceof LinkCurveGraphics ? -30 : 0;
    }

    connect() {
        if (!this.extendedLink.coreElement.px) return;
        this.extendedLink.coreElement.px.addChild(this);
    }

    place() {
        this.visible = this.extendedLink.coreElement.line?.visible ?? false;
        if (this.visible) {
            this.rotation = - this.parent.rotation;
            if (this.extendedLink.coreElement.source.circle) {
                this.scale.x = this.scale.y = this.extendedLink.coreElement.renderer.nodeScale;
            }
            this.position.x = this.parent.width * 0.5;
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
        this.text.text = text;
    }

    updateTextBackgroundColor(backgroundColor: ColorSource): void {
        this.sprite.tint = backgroundColor;
        // @ts-ignore
        this.text.style.fill = this.getCSSStyle().fill ?? this.extendedLink.coreElement.renderer.colors.text.rgb;
    }
}