import { App } from 'obsidian';
import { Container, Graphics, Texture } from 'pixi.js';
import { InteractiveManager } from '../interactiveManager';
import { ExtendedGraphSettings } from 'src/settings/settings';
import { getFile, getFileInteractives } from 'src/helperFunctions';
import { ArcsWrapper } from './arcs';
import { NodeImage } from './image';
import { GraphNode } from 'obsidian-typings';

const NODE_CIRCLE_RADIUS: number = 100;
const NODE_CIRCLE_X: number = 100;
const NODE_CIRCLE_Y: number = 100;

export class NodeWrapper extends Container {
    node: GraphNode;
    name: string;
    
    app: App;
    settings: ExtendedGraphSettings;
    
    nodeImage: NodeImage;
    arcsWrappers = new Map<string, ArcsWrapper>();
    background: Graphics;
    scaleFactor: number = 1;
    isActive: boolean = true;

    // ============================== CONSTRUCTOR ==============================

    constructor(node: GraphNode, app: App, settings: ExtendedGraphSettings, managers: InteractiveManager[]) {
        super();
        this.node = node;
        this.name = node.id;
        this.settings = settings;
        this.app = app;

        if (node.type === "" && managers.length > 0) {
            let layer = 1;
            for (const manager of managers) {
                const validTypes = this.getValidTypes(manager);
                this.createArcWrapper(manager, validTypes, layer);
                layer++;
            }
        }
    }

    private getValidTypes(manager: InteractiveManager): Set<string> {
        const file = getFile(this.app, this.node.id);
        if (!file) return new Set<string>();
        const types = getFileInteractives(manager.name, this.app, file);
        const validTypes = new Set<string>();
        for (const type of types) {
            if (manager.interactives.has(type)) {
                validTypes.add(type);
            }
        }
        if (validTypes.size === 0) validTypes.add(this.settings.interactiveSettings[manager.name].noneType);
        return validTypes;
    }

    private createArcWrapper(manager: InteractiveManager, types: Set<string>, layer: number) {
        const arcsWrapper = new ArcsWrapper(this, types, manager, layer);
        this.arcsWrappers.set(manager.name, arcsWrapper);
        this.addChild(arcsWrapper);
    }

    // ========================== CONNECT/DISCONNECT ===========================

    updateNode(): void {
        if (!this.node.circle) {
            const newNode = this.node.renderer.nodes.find(n => n.id === this.node.id);
            if (newNode && this.node !== newNode) {
                this.node.clearGraphics();
                this.disconnect();
                this.node = newNode;
            }
        }
    }

    connect(): void {
        if (this.node.circle && !this.node.circle.getChildByName(this.name)) {
            this.node.circle.addChild(this);
        }
    }

    disconnect(): void {
        this.removeFromParent();
    }

    // ============================= INITALIZATION =============================

    initGraphics(texture: Texture | undefined): void {
        this.placeNode();
        this.initNodeImage(texture);
        this.initArcsWrapper();
        this.initBackground();
    }

    private placeNode() {
        this.x = NODE_CIRCLE_X;
        this.y = NODE_CIRCLE_Y;
    }

    private initNodeImage(texture: Texture | undefined) {
        this.nodeImage = new NodeImage(texture);
        this.addChild(this.nodeImage);
    }

    private initArcsWrapper() {
        for (const arcWrapper of this.arcsWrappers.values()) {
            this.addChild(arcWrapper);
        }
    }

    private initBackground() {
        this.background = new Graphics();
        this.background.scale.set(NODE_CIRCLE_RADIUS / 10);
        this.addChildAt(this.background, 0);
    }

    // ============================ CLEAR GRAPHICS =============================

    clearGraphics(): void {
        this.background.destroy();
        this.nodeImage?.destroy({children: true});
        for (const arcWrapper of this.arcsWrappers.values()) {
            arcWrapper.clearGraphics();
        }
    }

    // ============================== FADE IN/OUT ==============================

    fadeIn() {
        this.nodeImage?.fadeIn();
    }

    fadeOut() {
        this.nodeImage?.fadeOut();
    }

    isAnyArcWrapperDisabled(): boolean {
        return [...this.arcsWrappers.values()].some((arcWrapper: ArcsWrapper) => arcWrapper.isFullyDisabled());
    }

    // ============================== EMPHASIZE ================================

    emphasize(scale: number, color?: number) {
        this.scaleFactor = scale;
        if (this.scaleFactor > 1) {
            this.background.clear();
            this.background
                .beginFill(color ? color : this.node.getFillColor().rgb)
                .drawCircle(0, 0, 10)
                .endFill();
        }
        else {
            this.background.clear();
        }
        this.scale.set(this.scaleFactor);
    }
}