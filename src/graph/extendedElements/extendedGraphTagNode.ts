import { GraphColorAttributes, } from "obsidian-typings";
import { ExtendedGraphNode, NodeShape, SettingQuery, TAG_KEY, TagNodeGraphicsWrapper } from "src/internal";

export class ExtendedGraphTagNode extends ExtendedGraphNode {
    graphicsWrapper: TagNodeGraphicsWrapper;


    // =============================== GRAPHICS ================================

    protected createGraphicsWrapper(): void {
        if (!this.graphicsWrapper) {
            this.graphicsWrapper = new TagNodeGraphicsWrapper(this);
        }
        this.graphicsWrapper.createGraphics();
        this.graphicsWrapperScale = NodeShape.nodeScaleFactor(this.graphicsWrapper.shape);
    }

    // ============================== NODE COLOR ===============================

    protected override needToChangeColor() {
        return this.instances.settings.enableFeatures[this.instances.type]["tags"]
            && !SettingQuery.excludeType(this.instances.settings, TAG_KEY, this.id.replace('#', ''));
    }

    protected override getFillColor(): GraphColorAttributes | undefined {
        const color = this.managers.get(TAG_KEY)?.getColor(this.id.replace('#', ''));
        if (!color) return undefined;
        return { rgb: color, a: 1 }
    }
}