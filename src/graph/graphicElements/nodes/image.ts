import { Graphics, Sprite, Texture } from "pixi.js";
import { NodeShape, ShapeEnum } from "src/internal";

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

        // Size
        const scaleNoBorder = 2 * 100 * NodeShape.getSizeFactor(shape) / this.textureSize;
        const scaleBorder = scaleNoBorder * (1 - borderFactor);

        this.scale.set(scaleBorder);
        mask.scale.set(mask.getDrawingResolution() / scaleNoBorder);
    }

    changeImage(texture: Texture) {
        this.texture = texture;
    }
}