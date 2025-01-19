import { ColorSource, Graphics, Sprite, Texture } from "pixi.js";
import { NodeShape, ShapeEnum } from "./shapes";

export class NodeImage extends Sprite {
    opacityLayer: Graphics;
    textureSize: number;

    constructor(texture: Texture = Texture.EMPTY, borderFactor: number, shape: ShapeEnum) {
        super(texture);
        this.textureSize = Math.min(texture.width, texture.height);

        this.name = "image";
        this.anchor.set(0.5);
        
        // Mask
        const mask = new NodeShape(shape).drawMask();
        this.mask = mask;
        this.addChild(mask);

        // Opacity Layer
        this.opacityLayer = new Graphics();
        this.opacityLayer.width = texture.width;
        this.opacityLayer.height = texture.height;
        this.updateOpacityLayerColor(0xFF0000);
        this.opacityLayer.alpha = 0;
        this.addChild(this.opacityLayer);

        // Size
        const scaleNoBorder = 2 * 100 * NodeShape.getSizeFactor(shape) / this.textureSize;
        const scaleBorder = scaleNoBorder * (1 - borderFactor);

        this.scale.set(scaleBorder);
        mask.scale.set(mask.getDrawingResolution() / scaleNoBorder);
    }

    changeImage(texture: Texture) {
        this.texture = texture;
    }

    updateOpacityLayerColor(backgroundColor: ColorSource): void {
        this.opacityLayer.clear();
        this.opacityLayer
            .beginFill(backgroundColor)
            .drawRect(-0.5 * this.textureSize, -0.5 * this.textureSize, this.textureSize, this.textureSize)
            .endFill();
    }

    fadeIn() {
        this.opacityLayer.alpha = 0;
    }

    fadeOut() {
        this.opacityLayer.alpha = 0.8;
    }
}