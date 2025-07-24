import { GraphColorAttributes } from "obsidian-typings";
import { evaluateCMap, ExtendedGraphNode, FileNodeGraphicsWrapper, NodeShape, PluginInstances, ShapeEnum } from "src/internal";

export class ExtendedGraphFileNode extends ExtendedGraphNode {
    graphicsWrapper: FileNodeGraphicsWrapper;

    // =============================== GRAPHICS ================================

    protected override needGraphicsWrapper(): boolean {
        return super.needGraphicsWrapper()
            || this.needBackground()
            || this.needImage()
            || this.needArcs();
    }

    public needImage(): boolean {
        return this.instances.settings.enableFeatures[this.instances.type]['imagesFromProperty']
            || this.instances.settings.enableFeatures[this.instances.type]['imagesFromEmbeds'];
    }

    public needBackground(): boolean {
        return !this.icon && (this.instances.settings.enableFeatures[this.instances.type]['focus']
            || this.graphicsWrapper?.shape !== ShapeEnum.CIRCLE);
    }

    public needArcs(): boolean {
        if ((this.coreElement.type !== "" && !(this.instances.type === "localgraph" && this.coreElement.type === "focused")) || this.managers.size === 0)
            return false;

        for (const [key, manager] of this.managers) {
            if (this.instances.settings.interactiveSettings[key].showOnGraph) {
                return true;
            }
        }

        return false;
    }

    protected createGraphicsWrapper(): void {
        if (!this.graphicsWrapper) {
            this.graphicsWrapper = new FileNodeGraphicsWrapper(this);
        }
        this.graphicsWrapper.createGraphics();
        this.graphicsWrapperScale = NodeShape.nodeScaleFactor(this.graphicsWrapper.shape);
    }

    // ============================== NODE COLOR ===============================

    protected override needToChangeColor() {
        return super.needToChangeColor() ||
            (this.instances.settings.enableFeatures[this.instances.type]["elements-stats"]
                && PluginInstances.settings.nodesColorFunction !== "default");
    }

    protected override needToUpdateGraphicsColor(): boolean {
        return super.needToUpdateGraphicsColor()
            || !!this.graphicsWrapper.background
            || !!this.graphicsWrapper?.iconSprite;
    }

    protected override getFillColor(): GraphColorAttributes | undefined {
        if ((this.instances.settings.enableFeatures[this.instances.type]["elements-stats"]
            && PluginInstances.settings.nodesColorFunction !== "default")) {
            const rgb = (this.instances.nodesColorCalculator ?? PluginInstances.graphsManager.nodesColorCalculator)?.filesStats.get(this.id);
            if (rgb) return { rgb: rgb.value, a: 1 }
        }

        if (this.instances.type === "localgraph" && this.instances.settings.colorBasedOnDepth && this.instances.graphologyGraph?.graphology) {
            const maxDepth = 5;
            const depth = this.instances.graphologyGraph.graphology.getNodeAttribute(this.id, 'depth');
            if (depth && depth > 0) {
                const x = (depth - 1) / (maxDepth - 1);
                return { rgb: evaluateCMap(x, this.instances.settings.depthColormap, this.instances.settings), a: 1 };
            }
        }

        return super.getFillColor();
    }
}