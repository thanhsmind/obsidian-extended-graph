import { getIcon } from 'obsidian';
import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { ArcsCircle } from './arcsCircle';
import { NodeImage } from './image';
import { GraphNode } from 'obsidian-typings';
import { GraphicsWrapper } from '../../abstractAndInterfaces/graphicsWrapper';
import { ExtendedGraphNode } from '../../extendedElements/extendedGraphNode';
import { InteractiveManager } from 'src/graph/interactiveManager';

const NODE_CIRCLE_RADIUS: number = 100;
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
    background?: Graphics;
    scaleFactor: number = 1;

    constructor(extendedElement: ExtendedGraphNode) {
        this.extendedElement = extendedElement;
        this.name = extendedElement.id;
        this.pixiElement = new Container();
        this.pixiElement.name = this.name;
    }


    // ============================= INITALIZATION =============================

    initGraphics(texture?: Texture): void {
        this.placeNode();
        if (this.extendedElement.needArcs()) this.initArcsWrapper();
        if (this.extendedElement.needBackground()) this.initBackground();
        this.connect();
    }

    private placeNode() {
        this.pixiElement.x = NODE_CIRCLE_X;
        this.pixiElement.y = NODE_CIRCLE_Y;
    }

    initNodeImage(texture: Texture | undefined) {
        if (!this.extendedElement.needImage()) return;
        this.nodeImage = new NodeImage(texture);
        this.pixiElement.addChild(this.nodeImage);
    }

    private initArcsWrapper() {
        this.managerGraphicsMap = new Map<string, ArcsCircle>();
    }

    private initBackground() {
        this.background = new Graphics();
        this.background.scale.set(NODE_CIRCLE_RADIUS / 10);
        this.pixiElement.addChildAt(this.background, 0);
    }

    createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number) {
        const arcsCircle = new ArcsCircle(types, manager, layer);
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
        throw new Error('Method not implemented.');
    }

    // ============================ ENABLE/DISABLE =============================

    toggleType(type: string, enable: boolean): void {
        throw new Error('Method not implemented.');
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
        this.nodeImage?.fadeIn();
    }

    fadeOut() {
        this.nodeImage?.fadeOut();
    }

    // =============================== EMPHASIZE ===============================

    emphasize(scale: number, color?: number) {
        if (!this.background) return;

        this.scaleFactor = scale;
        if (this.scaleFactor > 1) {
            this.background.clear();
            this.background
                .beginFill(color ? color : this.extendedElement.coreElement.getFillColor().rgb)
                .drawCircle(0, 0, 10)
                .endFill();
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

}

