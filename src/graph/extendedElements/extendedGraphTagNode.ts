import { GraphColorAttributes, } from "obsidian-typings";
import { ExtendedGraphNode, NodeShape, PluginInstances, rgb2int, TAG_KEY, TagNodeGraphicsWrapper } from "src/internal";

export class ExtendedGraphTagNode extends ExtendedGraphNode {
    graphicsWrapper: TagNodeGraphicsWrapper;


    // =============================== GRAPHICS ================================

    protected createGraphicsWrapper(): void {
        this.graphicsWrapper = new TagNodeGraphicsWrapper(this);
        this.graphicsWrapper.createGraphics();
        this.graphicsWrapperScale = NodeShape.nodeScaleFactor(this.graphicsWrapper.shape);
    }

    // ============================== NODE COLOR ===============================

    protected override needToChangeColor() {
        return this.instances.settings.enableFeatures[this.instances.type]["tags"]
            && !this.instances.settings.interactiveSettings[TAG_KEY].unselected.contains(this.id.replace('#', ''));
    }

    protected override getFillColor(): GraphColorAttributes | undefined {
        const rgb = this.managers.get(TAG_KEY)?.getColor(this.id.replace('#', ''));
        if (!rgb) return undefined;
        return { rgb: rgb2int(rgb), a: 1 }
    }
}