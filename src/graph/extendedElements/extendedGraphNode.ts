import { App } from "obsidian";
import { ExtendedGraphElement } from "../abstractAndInterfaces/extendedGraphElement";
import { ExtendedGraphSettings } from "src/settings/settings";
import { NodeGraphicsWrapper } from "../graphicElements/nodes/nodeGraphicsWrapper";
import { GraphNode } from "obsidian-typings";
import { InteractiveManager } from "../interactiveManager";
import { ShapeEnum } from "../graphicElements/nodes/shapes";

export class ExtendedGraphNode extends ExtendedGraphElement<GraphNode> {
    app: App;
    settings: ExtendedGraphSettings;
    graphicsWrapper?: NodeGraphicsWrapper;
    isPinned: boolean = false;

    // ============================== CONSTRUCTOR ==============================

    constructor(node: GraphNode, types: Map<string, Set<string>>, managers: InteractiveManager[], app: App, settings: ExtendedGraphSettings) {
        super(node, types, managers);
        this.settings = settings;
        this.app = app;
        this.initGraphicsWrapper();
    }

    protected needGraphicsWrapper(): boolean {
        return this.needImage()
            || this.needBackground()
            || this.needArcs()
            || this.needPin();
    }

    public needImage(): boolean { return this.settings.enableImages; }
    public needBackground(): boolean {
        return this.settings.fadeOnDisable
            || this.settings.enableFocusActiveNote
            || this.graphicsWrapper?.shape !== ShapeEnum.CIRCLE;
    }
    public needArcs(): boolean {
        return this.coreElement.type === "" && this.managers.size > 0;
    }
    public needPin(): boolean { return true; }

    protected createGraphicsWrapper(): void {
        this.graphicsWrapper = new NodeGraphicsWrapper(this);
        this.graphicsWrapper.initGraphics();

        let layer = 1;
        for (const [key, manager] of this.managers) {
            const validTypes = this.getTypes(key);
            this.graphicsWrapper.createManagerGraphics(manager, validTypes, layer);
            layer++;
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

    // ================================ TOGGLE =================================

    override disable() {
        super.disable();

        this.graphicsWrapper?.fadeOut();
    }

    override enable() {
        super.enable();

        this.graphicsWrapper?.fadeIn();
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