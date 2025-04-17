import { Texture } from "pixi.js";
import { ExtendedGraphAttachmentNode, NodeGraphicsWrapper, NodeImage } from "src/internal";

export class AttachmentNodeGraphicsWrapper extends NodeGraphicsWrapper {
    // Interface instance values
    extendedElement: ExtendedGraphAttachmentNode;

    // Additional graphics elements
    nodeImage?: NodeImage;
    texture?: Texture;

    // ============================= INITALIZATION =============================

    override createGraphics(): void {
        super.createGraphics();
        if (this.texture) this.initNodeImage(this.texture);
    }

    initNodeImage(texture: Texture | undefined) {
        if (!this.extendedElement.needImage()) return;
        if (this.nodeImage && (this.nodeImage.destroyed || !this.nodeImage.parent)) {
            if (this.nodeImage.parent) this.nodeImage.removeFromParent();
            if (!this.nodeImage.destroyed) this.nodeImage.destroy({ children: true });
        }
        if (texture) {
            this.texture = texture;
            this.nodeImage = new NodeImage(texture, this.extendedElement.instances.settings.borderFactor, this.shape);
            this.pixiElement.addChildAt(this.nodeImage, this.pixiElement.children.length > 0 ? Math.max(1, this.pixiElement.children.length - 2) : 0);
        }
    }

    // ============================ CLEAR GRAPHICS =============================

    override clearGraphics(): void {
        this.nodeImage?.destroy({ children: true });
        super.clearGraphics();
    }
}