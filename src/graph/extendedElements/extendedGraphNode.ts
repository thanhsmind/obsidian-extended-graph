import { App } from "obsidian";
import { ExtendedGraphSettings } from "src/settings/settings";
import { NodeGraphicsWrapper } from "../graphicElements/nodes/nodeGraphicsWrapper";
import { GraphNode } from "obsidian-typings";
import { InteractiveManager } from "../interactiveManager";
import { NodeShape, ShapeEnum } from "../graphicElements/nodes/shapes";
import { getFile, getFileInteractives, isNumber } from "src/helperFunctions";
import ExtendedGraphPlugin from "src/main";
import { ExtendedGraphElement } from "./extendedGraphElement";

export class ExtendedGraphNode extends ExtendedGraphElement<GraphNode> {
    app: App;
    graphicsWrapper?: NodeGraphicsWrapper;
    isPinned: boolean = false;

    // Size
    graphicsWrapperScale: number = 1;
    radius: number = NodeShape.RADIUS;
    getSizeCallback?: () => number;

    // ============================== CONSTRUCTOR ==============================

    constructor(node: GraphNode, types: Map<string, Set<string>>, managers: InteractiveManager[], settings: ExtendedGraphSettings, app: App) {
        super(node, types, managers, settings);
        this.app = app;

        this.initRadius();
        this.changeGetSize();
        this.initGraphicsWrapper();
    }

    // ================================ UNLOAD =================================

    unload() {
        this.restoreGetSize();
    }

    // =============================== GRAPHICS ================================

    protected needGraphicsWrapper(): boolean {
        return this.needImage()
            || this.needBackground()
            || this.needArcs()
            || this.needPin();
    }

    public needImage(): boolean { return this.settings.enableFeatures['images']; }
    
    public needBackground(): boolean {
        return this.settings.enableFeatures['focus']
            || this.graphicsWrapper?.shape !== ShapeEnum.CIRCLE;
    }
    
    public needOpacityLayer(): boolean { return this.settings.fadeOnDisable; }
    
    public needArcs(): boolean {
        return this.coreElement.type === "" && this.managers.size > 0;
    }

    public needPin(): boolean { return true; }

    protected createGraphicsWrapper(): void {
        this.graphicsWrapper = new NodeGraphicsWrapper(this);
        this.graphicsWrapper.initGraphics();
        this.graphicsWrapperScale = NodeShape.nodeScaleFactor(this.graphicsWrapper.shape);

        let layer = 1;
        for (const [key, manager] of this.managers) {
            const validTypes = this.getTypes(key);
            this.graphicsWrapper.createManagerGraphics(manager, validTypes, layer);
            layer++;
        }
    }

    // =============================== NODE SIZE ===============================

    private initRadius() {
        if (!this.settings.enableFeatures['node-size']) return;

        const property = this.settings.nodeSizeProperty;
        if (!property || property === "") return;

        const file = getFile(this.app, this.id);
        if (!file) return;
        
        const values = getFileInteractives(property, this.app, file);
        for (const value of values) {
            if (isNumber(value)) {
                this.radius = parseInt(value);
                if (isNaN(this.radius)) this.radius = NodeShape.RADIUS;
                break;
            }
        }
    }
    
    private changeGetSize() {
        if (this.getSizeCallback && (!this.graphicsWrapper || this.graphicsWrapper?.shape === ShapeEnum.CIRCLE)) {
            this.restoreGetSize();
            return;
        }
        else if (this.getSizeCallback) {
            return;
        }
        this.getSizeCallback = this.coreElement.getSize;
        const getSize = this.getSize.bind(this);
        this.coreElement.getSize = new Proxy(this.coreElement.getSize, {
            apply(target, thisArg, args) {
                return getSize.call(this, ...args)
            }
        });
    }

    private restoreGetSize() {
        if (!this.getSizeCallback) return;
        this.coreElement.getSize = this.getSizeCallback;
        this.getSizeCallback = undefined;
    }

    getSize(): number {
        const customRadiusFactor = this.radius / NodeShape.RADIUS;
        const node = this.coreElement;
        if (this.settings.enableFeatures['node-size'] && this.settings.nodeSizeFunction !== 'default') {
            const originalSize = node.renderer.fNodeSizeMult * 8;
            let customFunctionFactor = (this.app.plugins.getPlugin('extended-graph') as ExtendedGraphPlugin).graphsManager.nodeSizeCalculator?.fileSizes.get(this.id);
            return originalSize * this.graphicsWrapperScale * customRadiusFactor * (customFunctionFactor ?? 1);
        }
        else {
            const originalSize = node.renderer.fNodeSizeMult * Math.max(8, Math.min(3 * Math.sqrt(node.weight + 1), 30));
            return originalSize * this.graphicsWrapperScale * customRadiusFactor;
        }
    }

    // ============================== CORE ELEMENT =============================

    protected override isCoreElementUptodate(): boolean {
        return !!this.coreElement.circle;
    }

    override isSameCoreElement(node: GraphNode): boolean {
        return node.id === this.id;
    }

    override getCoreCollection(): GraphNode[] {
        return this.coreElement.renderer.nodes;
    }

    // ================================ GETTERS ================================

    getID(): string {
        return this.coreElement.id;
    }

    // =============================== PIN NODES ===============================

    pin(): void {
        this.isPinned = true;
        this.graphicsWrapper?.pin();
    }

    unpin(): void {
        this.isPinned = false;
        this.graphicsWrapper?.unpin();
    }
}