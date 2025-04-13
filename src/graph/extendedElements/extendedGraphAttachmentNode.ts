import { GraphNode } from "obsidian-typings";
import { AttachmentNodeGraphicsWrapper, ExtendedGraphNode, FileNodeGraphicsWrapper, GraphInstances, InteractiveManager, NodeShape } from "src/internal";

export class ExtendedGraphAttachmentNode extends ExtendedGraphNode {
    graphicsWrapper: AttachmentNodeGraphicsWrapper;

    // =============================== GRAPHICS ================================

    protected override needGraphicsWrapper(): boolean {
        return super.needGraphicsWrapper()
            || this.needImage();
    }

    public needImage(): boolean {
        return this.instances.settings.enableFeatures[this.instances.type]['imagesForAttachments'];
    }

    protected createGraphicsWrapper(): void {
        this.graphicsWrapper = new AttachmentNodeGraphicsWrapper(this);
        this.graphicsWrapper.initGraphics();
        this.graphicsWrapperScale = NodeShape.nodeScaleFactor(this.graphicsWrapper.shape);
    }
}