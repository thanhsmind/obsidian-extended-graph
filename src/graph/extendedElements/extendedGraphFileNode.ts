import { App } from "obsidian";
import { GraphNode } from "obsidian-typings";
import { ExtendedGraphNode, ExtendedGraphSettings, FileNodeGraphicsWrapper, InteractiveManager, NodeShape, ShapeEnum } from "src/internal";


export class ExtendedGraphFileNode extends ExtendedGraphNode {
    graphicsWrapper: FileNodeGraphicsWrapper;
    
    constructor(node: GraphNode, types: Map<string, Set<string>>, managers: InteractiveManager[], settings: ExtendedGraphSettings, app: App) {
        super(node, types, managers, settings, app);
    }

    // =============================== GRAPHICS ================================
    
    protected override needGraphicsWrapper(): boolean {
        return super.needGraphicsWrapper()
            || this.needBackground()
            || this.needImage()
            || this.needArcs();
    }

    public needImage(): boolean { return this.settings.enableFeatures['images']; }
    
    public needBackground(): boolean {
        return this.settings.enableFeatures['focus']
            || this.graphicsWrapper?.shape !== ShapeEnum.CIRCLE;
    }
        
    public needArcs(): boolean {
        if (this.coreElement.type !== "" || this.managers.size === 0)
            return false;
        
        for (const [key, manager] of this.managers) {
            if (this.settings.interactiveSettings[key].showOnGraph) {
                return true;
            }
        }

        return false;
    }
    
    protected createGraphicsWrapper(): void {
        this.graphicsWrapper = new FileNodeGraphicsWrapper(this);
        this.graphicsWrapper.initGraphics();
        this.graphicsWrapperScale = NodeShape.nodeScaleFactor(this.graphicsWrapper.shape);

        let layer = 1;
        for (const [key, manager] of this.managers) {
            if (!this.graphicsWrapper.extendedElement.settings.interactiveSettings[key].showOnGraph) continue;
            const validTypes = this.getTypes(key);
            this.graphicsWrapper.createManagerGraphics(manager, validTypes, layer);
            layer++;
        }
    }
}