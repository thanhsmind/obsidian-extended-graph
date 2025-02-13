import { Texture } from "pixi.js";
import { ExtendedGraphAttachmentNode, NodeGraphicsWrapper, NodeImage } from "src/internal";

export class AttachmentNodeGraphicsWrapper extends NodeGraphicsWrapper {
    // Interface instance values
    extendedElement: ExtendedGraphAttachmentNode;

    // Additional graphics elements
    nodeImage?: NodeImage;

    // ============================= INITALIZATION =============================

    initNodeImage(texture: Texture | undefined) {
        if (!this.extendedElement.needImage()) return;
        this.nodeImage = new NodeImage(texture, this.extendedElement.instances.settings.borderFactor, this.shape);
        this.pixiElement.addChildAt(this.nodeImage, this.pixiElement.children.length > 0 ? Math.max(1, this.pixiElement.children.length - 2) : 0);
    }

    // ============================ CLEAR GRAPHICS =============================

    override clearGraphics(): void {
        this.nodeImage?.destroy({children: true});
        super.clearGraphics();
    }
}