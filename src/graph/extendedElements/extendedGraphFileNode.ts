import { App } from "obsidian";
import { GraphColorAttributes, GraphNode } from "obsidian-typings";
import { ExtendedGraphNode, ExtendedGraphSettings, FileNodeGraphicsWrapper, GraphType, InteractiveManager, NodeShape, ShapeEnum } from "src/internal";
import ExtendedGraphPlugin from "src/main";


export class ExtendedGraphFileNode extends ExtendedGraphNode {
    graphicsWrapper: FileNodeGraphicsWrapper;
    coreGetFillColor: (() => GraphColorAttributes) | undefined;
    
    constructor(node: GraphNode, types: Map<string, Set<string>>, managers: InteractiveManager[], settings: ExtendedGraphSettings, graphType: GraphType, app: App) {
        super(node, types, managers, settings, graphType, app);
        if (settings.enableFeatures[this.graphType]['node-color']) {
            this.changeGetFillColor();
        }
    }

    // ================================ UNLOAD =================================

    unload(): void {
        this.restoreGetFillColor();
        super.unload();
    }

    // =============================== GRAPHICS ================================
    
    protected override needGraphicsWrapper(): boolean {
        return super.needGraphicsWrapper()
            || this.needBackground()
            || this.needImage()
            || this.needArcs();
    }

    public needImage(): boolean { return this.settings.enableFeatures[this.graphType]['images']; }
    
    public needBackground(): boolean {
        return this.settings.enableFeatures[this.graphType]['focus']
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

    // ============================== NODE COLOR ===============================
    
    private changeGetFillColor() {
        if (this.coreGetFillColor || !this.settings.enableFeatures[this.graphType]["node-color"] || this.settings.nodeColorFunction === "default") {
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

    private restoreGetFillColor() {
        if (!this.coreGetFillColor) return;
        this.coreElement.getFillColor = this.coreGetFillColor;
        this.coreGetFillColor = undefined;
    }

    private getFillColor(): GraphColorAttributes | undefined {
        const rgb = (this.app.plugins.getPlugin('extended-graph') as ExtendedGraphPlugin).graphsManager.nodeColorCalculator?.fileStats.get(this.id);
        if (!rgb) return undefined;
        return { rgb: rgb, a: 1 }
    }
}