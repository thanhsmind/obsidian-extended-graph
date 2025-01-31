import { Texture } from "pixi.js";
import { ArcsCircle, ExtendedGraphFileNode, getFile, getFileInteractives, InteractiveManager, NodeGraphicsWrapper, NodeImage, NodeShape, PluginInstances } from "src/internal";

export class FileNodeGraphicsWrapper extends NodeGraphicsWrapper {
    // Interface instance values
    extendedElement: ExtendedGraphFileNode;
    managerGraphicsMap?: Map<string, ArcsCircle>;

    // Additional graphics elements
    nodeImage?: NodeImage;
    background?: NodeShape;

    // ============================= INITALIZATION =============================

    override initGraphics(): void {
        super.initGraphics();
        if (this.extendedElement.needBackground()) this.initBackground();
        if (this.extendedElement.needArcs()) this.initArcsWrapper();
    }
    
    private initArcsWrapper() {
        this.managerGraphicsMap = new Map<string, ArcsCircle>();
    }

    private initBackground() {
        this.background = new NodeShape(this.shape);
        if (this.extendedElement.instances.settings.enableFeatures[this.extendedElement.instances.type]['shapes']) {
            this.background.drawFill(this.getFillColor().rgb);
        }
        this.background.scale.set(this.background.getDrawingResolution());
        this.pixiElement.addChildAt(this.background, 0);
    }

    initNodeImage(texture: Texture | undefined) {
        if (!this.extendedElement.needImage()) return;
        this.nodeImage = new NodeImage(texture, this.extendedElement.instances.settings.borderFactor, this.shape);
        this.pixiElement.addChildAt(this.nodeImage, this.pixiElement.children.length > 0 ? Math.max(1, this.pixiElement.children.length - 2) : 0);
    }

    createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number) {
        const arcsCircle = new ArcsCircle(types, manager, layer, this.shape);
        this.managerGraphicsMap?.set(manager.name, arcsCircle);
        this.pixiElement.addChild(arcsCircle);
    }

    resetManagerGraphics(manager: InteractiveManager) {
        const file = getFile(this.extendedElement.id);
        if (!file) return;
        const arcCicle = this.managerGraphicsMap?.get(manager.name);
        const types = this.extendedElement.getTypes(manager.name);

        if (!arcCicle) {
            this.createManagerGraphics(manager, types, this.managerGraphicsMap?.size ?? 0);
        }
        else {
            arcCicle.clearGraphics();
            arcCicle.setTypes(types);
            arcCicle.initGraphics();
            arcCicle.updateGraphics();
        }
    }

    // ============================ CLEAR GRAPHICS =============================

    override clearGraphics(): void {
        this.background?.destroy();
        this.nodeImage?.destroy({children: true});
        if (this.managerGraphicsMap) {
            for (const arcWrapper of this.managerGraphicsMap.values()) {
                arcWrapper.clearGraphics();
            }
        }
        super.clearGraphics();
    }
    
    // =============================== EMPHASIZE ===============================

    emphasize(bigger: boolean) {
        if (!this.background) return;

        this.scaleFactor = bigger ? PluginInstances.settings.focusScaleFactor : 1;
        if (bigger || this.extendedElement.instances.settings.enableFeatures[this.extendedElement.instances.type]['shapes']) {
            const color = bigger ? this.extendedElement.instances.renderer.colors.fillFocused.rgb : this.getFillColor().rgb;
            this.background.clear();
            this.background.drawFill(color);
        }
        else {
            this.background.clear();
        }
        this.pixiElement.scale.set(this.scaleFactor);
    }
}