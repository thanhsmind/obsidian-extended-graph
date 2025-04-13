import { GraphColorAttributes } from "obsidian-typings";
import { ExtendedGraphNode, FileNodeGraphicsWrapper, NodeShape, PluginInstances, ShapeEnum } from "src/internal";

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
        return this.instances.settings.enableFeatures[this.instances.type]['focus']
            || this.graphicsWrapper?.shape !== ShapeEnum.CIRCLE;
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
        this.graphicsWrapper = new FileNodeGraphicsWrapper(this);
        this.graphicsWrapper.initGraphics();
        this.graphicsWrapperScale = NodeShape.nodeScaleFactor(this.graphicsWrapper.shape);
    }

    // ============================== NODE COLOR ===============================

    protected override needToChangeColor() {
        return this.instances.settings.enableFeatures[this.instances.type]["elements-stats"]
            && PluginInstances.settings.nodesColorFunction !== "default";
    }

    protected override getFillColor(): GraphColorAttributes | undefined {
        const rgb = PluginInstances.graphsManager.nodesColorCalculator?.filesStats.get(this.id);
        if (!rgb) return undefined;
        return { rgb: rgb.value, a: 1 }
    }
}