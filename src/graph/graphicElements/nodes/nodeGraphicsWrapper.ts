import { getIcon } from 'obsidian';
import { Assets, ColorSource, Container, Sprite, Texture } from 'pixi.js';
import { ArcsCircle } from './arcsCircle';
import { NodeImage } from './image';
import { GraphColorAttributes, GraphNode } from 'obsidian-typings';
import { GraphicsWrapper } from '../../abstractAndInterfaces/graphicsWrapper';
import { ExtendedGraphNode } from '../../extendedElements/extendedGraphNode';
import { InteractiveManager } from 'src/graph/interactiveManager';
import { NodeShape, ShapeEnum } from './shapes';
import { QueryData, QueryMatcher } from 'src/queries/queriesMatcher';
import { getFile, getFileInteractives } from 'src/helperFunctions';

const NODE_CIRCLE_X: number = 100;
const NODE_CIRCLE_Y: number = 100;


export class NodeGraphicsWrapper implements GraphicsWrapper<GraphNode> {
    // Interface instance values
    name: string;
    extendedElement: ExtendedGraphNode;
    pixiElement: Container;
    managerGraphicsMap?: Map<string, ArcsCircle>;

    // Additional graphics elements
    nodeImage?: NodeImage;
    opacityLayer?: NodeShape;
    background?: NodeShape;
    scaleFactor: number = 1;

    // Shape specific
    shape: ShapeEnum = ShapeEnum.CIRCLE;

    constructor(extendedElement: ExtendedGraphNode) {
        this.extendedElement = extendedElement;
        this.name = extendedElement.id;
        this.pixiElement = new Container();
        this.pixiElement.name = this.name;
        
        this.initShape();
    }

    private initShape() {
        if (!this.extendedElement.settings.enableFeatures['shapes']) return;
        const app = this.extendedElement.app;
        const shapeQueries: {[k: string]: QueryData} = Object.fromEntries(Object.entries(this.extendedElement.settings.shapeQueries).sort((a: [string, QueryData], b: [string, QueryData]) => {
            return a[1].index - b[1].index;
        }));
        for (const shape of Object.keys(shapeQueries)) {
            const queriesMatcher = new QueryMatcher(shapeQueries[shape]);
            const file = getFile(app, this.extendedElement.id);
            if (!file) return;
            if (queriesMatcher.doesMatch(app, file)) {
                this.shape = shape as ShapeEnum;
                return;
            }
        }
    }

    // ============================= PROXY METHODS =============================


    // ============================= INITALIZATION =============================

    initGraphics(): void {
        this.placeNode();
        if (this.extendedElement.needArcs()) this.initArcsWrapper();
        if (this.extendedElement.needBackground()) this.initBackground();
        if (this.extendedElement.needOpacityLayer()) this.initOpacityLayer();
        this.connect();
    }

    private placeNode() {
        this.pixiElement.x = NODE_CIRCLE_X;
        this.pixiElement.y = NODE_CIRCLE_Y;
    }

    initNodeImage(texture: Texture | undefined) {
        if (!this.extendedElement.needImage()) return;
        this.nodeImage = new NodeImage(texture, this.extendedElement.settings.borderFactor, this.shape);
        this.pixiElement.addChildAt(this.nodeImage, this.pixiElement.children.length - 2);
    }

    private initArcsWrapper() {
        this.managerGraphicsMap = new Map<string, ArcsCircle>();
    }

    private initBackground() {
        this.background = new NodeShape(this.shape);
        if (this.extendedElement.settings.enableFeatures['shapes']) {
            this.background.drawFill(this.getFillColor().rgb);
        }
        this.background.scale.set(this.background.getDrawingResolution());
        this.pixiElement.addChildAt(this.background, 0);
    }

    private initOpacityLayer() {
        this.opacityLayer = new NodeShape(this.shape);
        this.opacityLayer.drawFill(0xFF0000);
        this.opacityLayer.scale.set(this.opacityLayer.getDrawingResolution());
        this.opacityLayer.alpha = 0;
        this.pixiElement.addChild(this.opacityLayer);
    }

    createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number) {
        const arcsCircle = new ArcsCircle(types, manager, layer, this.shape);
        this.managerGraphicsMap?.set(manager.name, arcsCircle);
        this.pixiElement.addChild(arcsCircle);
    }

    // ============================ CLEAR GRAPHICS =============================

    clearGraphics(): void {
        this.background?.destroy();
        this.nodeImage?.destroy({children: true});
        if (this.managerGraphicsMap) {
            for (const arcWrapper of this.managerGraphicsMap.values()) {
                arcWrapper.clearGraphics();
            }
        }
    }

    destroyGraphics(): void {
        this.pixiElement.destroy({children: true});
    }

    // ============================ UPDATE GRAPHICS ============================

    updateGraphics(): void {
        
    }

    updateOpacityLayerColor(backgroundColor: ColorSource): void {
        if (!this.opacityLayer) return;
        this.opacityLayer.clear();
        this.opacityLayer.drawFill(backgroundColor);
    }

    // ========================== CONNECT/DISCONNECT ===========================
    
    updateCoreElement(): void {
        const node = this.extendedElement.coreElement;
        if (!node.circle) {
            const newNode = node.renderer.nodes.find(n => n.id === this.name);
            if (newNode && node !== newNode) {
                node.clearGraphics();
                this.disconnect();
                this.extendedElement.coreElement = newNode;
            }
        }
    }

    connect(): void {
        if (this.extendedElement.coreElement.circle && !this.extendedElement.coreElement.circle.getChildByName(this.name)) {
            this.extendedElement.coreElement.circle.addChild(this.pixiElement);
        }
    }

    disconnect(): void {
        this.pixiElement.removeFromParent();
    }

    // ============================== FADE IN/OUT ==============================

    fadeIn() {
        if (this.opacityLayer) this.opacityLayer.alpha = 0;
    }

    fadeOut() {
        if (this.opacityLayer) this.opacityLayer.alpha = 0.8;
    }


    // =============================== EMPHASIZE ===============================

    emphasize(scale: number, color?: number) {
        if (!this.background) return;

        this.scaleFactor = scale;
        if (this.scaleFactor > 1 || this.extendedElement.settings.enableFeatures['shapes']) {
            color = color ? color : this.getFillColor().rgb;
            this.background.clear();
            this.background.drawFill(color);
        }
        else {
            this.background.clear();
        }
        this.pixiElement.scale.set(this.scaleFactor);
    }

    // ================================== PIN ==================================

    pin(): void {
        const svg = getIcon("pin");
        if (svg) {
            const bodyStyle = getComputedStyle(document.body);
            const stroke = bodyStyle.getPropertyValue("--color-base-00");

            const tail = svg.getElementsByTagName("path")[0];
            const head = svg.getElementsByTagName("path")[1];
            head.setAttribute("fill", this.extendedElement.app.getAccentColor());
            head.setAttribute("stroke", stroke);
            tail.setAttribute("stroke", this.extendedElement.app.getAccentColor());

            const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`
            Assets.load(svgDataUrl).then(texture => {
                const icon = new Sprite(texture);
                icon.name = "pin";
                icon.anchor.set(1, 0);
                icon.height = 80;
                icon.width = 80;
                icon.position.set(100, -100);

                this.pixiElement.addChild(icon);
            })
        }
    }

    unpin(): void {
        const icon = this.pixiElement.getChildByName("pin");
        if (icon) this.pixiElement.removeChild(icon);
    }

    // ================================= COLOR =================================

    getFillColor(): GraphColorAttributes {
        return this.extendedElement.coreElement.getFillColor();
    }

}

