import { GraphColorAttributes, GraphNode } from "obsidian-typings";
import { ExtendedGraphNode, GraphInstances, InteractiveManager, NodeShape, rgb2int, TAG_KEY, TagNodeGraphicsWrapper } from "src/internal";

export class ExtendedGraphTagNode extends ExtendedGraphNode {
    graphicsWrapper: TagNodeGraphicsWrapper;

    constructor(instances: GraphInstances, node: GraphNode, types: Map<string, Set<string>>, managers: InteractiveManager[]) {
        super(instances, node, types, managers);
        this.changeGetFillColor();
    }

    // ================================ UNLOAD =================================

    override unload(): void {
        this.restoreGetFillColor();
        super.unload();
    }

    // =============================== GRAPHICS ================================

    protected createGraphicsWrapper(): void {
        this.graphicsWrapper = new TagNodeGraphicsWrapper(this);
        this.graphicsWrapper.initGraphics();
        this.graphicsWrapperScale = NodeShape.nodeScaleFactor(this.graphicsWrapper.shape);
    }

    // ============================== NODE COLOR ===============================

    override changeGetFillColor() {
        if (!this.instances.settings.enableFeatures[this.instances.type]["tags"]
            || this.instances.settings.interactiveSettings[TAG_KEY].unselected.contains(this.id.replace('#', ''))) {
            this.restoreGetFillColor();
            return;
        }
        if (this.coreGetFillColor) {
            return;
        }
        this.coreGetFillColor = this.coreElement.getFillColor;
        const getFillColor = this.getFillColor.bind(this);
        this.coreElement.getFillColor = new Proxy(this.coreElement.getFillColor, {
            apply(target, thisArg, args) {
                return getFillColor.call(this, ...args) ?? target.call(thisArg, ...args);
            }
        });
    }

    override restoreGetFillColor() {
        if (!this.coreGetFillColor) return;
        this.coreElement.getFillColor = this.coreGetFillColor;
        this.coreGetFillColor = undefined;
    }

    protected override getFillColor(): GraphColorAttributes | undefined {
        const rgb = this.managers.get(TAG_KEY)?.getColor(this.id.replace('#', ''));
        if (!rgb) return undefined;
        return { rgb: rgb2int(rgb), a: 1 }
    }
}