import { getIcon } from 'obsidian';
import { Assets, ColorSource, Container, Sprite, Texture } from 'pixi.js';
import { GraphColorAttributes, GraphNode } from 'obsidian-typings';
import { ExtendedGraphNode, getBackgroundColor, getFile, GraphicsWrapper, IconicPlugin, IconizePlugin, int2hex, NodeShape, PluginInstances, QueryData, QueryMatcher, ShapeEnum } from 'src/internal';

const NODE_CIRCLE_X: number = 100;
const NODE_CIRCLE_Y: number = 100;


export abstract class NodeGraphicsWrapper implements GraphicsWrapper<GraphNode> {
    // Interface instance values
    name: string;
    extendedElement: ExtendedGraphNode;
    pixiElement: Container;

    opacityLayer?: NodeShape;
    iconBackgroundLayer?: NodeShape;
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
        if (!this.extendedElement.instances.settings.enableFeatures[this.extendedElement.instances.type]['shapes']) return;
        const shapeQueries: { [k: string]: QueryData } = Object.fromEntries(Object.entries(this.extendedElement.instances.settings.shapeQueries).sort((a: [string, QueryData], b: [string, QueryData]) => {
            return (a[1].index ?? 0) - (b[1].index ?? 0);
        }));
        for (const shape of Object.keys(shapeQueries)) {
            const queriesMatcher = new QueryMatcher(shapeQueries[shape]);
            const file = getFile(this.extendedElement.id);
            if (!file) return;
            if (queriesMatcher.doesMatch(file)) {
                this.shape = shape as ShapeEnum;
                return;
            }
        }
    }

    // ============================= INITALIZATION =============================

    initGraphics(): void {
        this.placeNode();
        if (this.extendedElement.needIcon()) this.initIcon();
        if (this.extendedElement.needOpacityLayer()) this.initOpacityLayer();
        this.connect();
    }

    private placeNode() {
        this.pixiElement.x = NODE_CIRCLE_X;
        this.pixiElement.y = NODE_CIRCLE_Y;
    }

    private initOpacityLayer() {
        this.opacityLayer = new NodeShape(this.shape);
        this.opacityLayer.drawFill(0xFF0000);
        this.opacityLayer.scale.set(this.opacityLayer.getDrawingResolution());
        this.opacityLayer.alpha = 0;
        this.pixiElement.addChild(this.opacityLayer);
    }

    private getSvgFromIconic(): SVGSVGElement | null {
        const iconic: IconicPlugin | null = PluginInstances.app.plugins.getPlugin('iconic') as IconicPlugin;
        if (!iconic || !iconic.settings.fileIcons.hasOwnProperty(this.extendedElement.id)) return null;

        const data = iconic.settings.fileIcons[this.extendedElement.id];
        const svg = getIcon(data.icon);
        if (!svg) return null;

        const bodyStyle = getComputedStyle(document.body);
        let color: string;
        if (data.hasOwnProperty("color")) {
            color = bodyStyle.getPropertyValue(`--color-${data.color}`) || bodyStyle.getPropertyValue("--graph-node") || bodyStyle.getPropertyValue("--color-base-00");
        }
        else {
            color = int2hex(this.getFillColor().rgb);
        }

        svg.setAttribute("stroke", color);
        return svg;
    }

    private getSvgFromIconize(): SVGSVGElement | null {
        const iconize: IconizePlugin | null = PluginInstances.app.plugins.getPlugin('obsidian-icon-folder') as IconizePlugin;
        if (!iconize || !iconize.api.util.dom.hasOwnProperty("getIconNodeFromPath")) return null;

        const iconNode = iconize.api.util.dom.getIconNodeFromPath(this.extendedElement.id);
        const svg = iconNode.querySelector("svg") as SVGSVGElement;
        if (!svg) return null;

        if (!iconize.hasOwnProperty("data")
            || !iconize.data.hasOwnProperty(this.extendedElement.id)
            || !iconize.data[this.extendedElement.id].hasOwnProperty("iconColor")) {
            const bodyStyle = getComputedStyle(document.body);
            const color = bodyStyle.getPropertyValue("--graph-node") || bodyStyle.getPropertyValue("--color-base-00");
            svg.setAttribute("stroke", color);
            return svg;
        }
        const color = iconize.data[this.extendedElement.id].iconColor;
        svg.setAttribute("stroke", color);
        return svg;
    }

    private initIcon() {
        let svg: SVGSVGElement | null = null;

        svg = this.getSvgFromIconic();
        if (!svg) {
            svg = this.getSvgFromIconize();
        }

        if (svg) {
            const s = new XMLSerializer();
            const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.serializeToString(svg))}`;

            this.pixiElement.sortableChildren = true;
            const createSprite = (texture: Texture) => {
                const sprite = new Sprite(texture);
                sprite.name = "icon";
                sprite.anchor.set(0.5, 0.5);
                sprite.height = 200;
                sprite.width = 200;
                this.pixiElement.addChild(sprite);
            }

            // Lower resolution, better performance
            /*Assets.load(svgDataUrl).then(texture => {
                createSprite(texture);
            });*/

            // Higher resolution, worse performance
            const texture = Texture.from(svgDataUrl, { resourceOptions: { scale: 12 / svg.width.baseVal.value * 3 } });
            createSprite(texture);

            // Hide circle
            this.iconBackgroundLayer = new NodeShape(this.shape);
            this.iconBackgroundLayer.drawFill(getBackgroundColor(this.extendedElement.coreElement.renderer));
            this.iconBackgroundLayer.scale.set(this.iconBackgroundLayer.getDrawingResolution() + 0.5);
            this.iconBackgroundLayer.alpha = 10;
            this.iconBackgroundLayer.zIndex = -1;
            this.pixiElement.addChild(this.iconBackgroundLayer);
        }
    }

    updateIconBackgroundLayerColor(backgroundColor: ColorSource): void {
        if (!this.iconBackgroundLayer) return;
        this.iconBackgroundLayer.tint = backgroundColor;
    }

    // ============================ CLEAR GRAPHICS =============================

    clearGraphics(): void {

    }

    destroyGraphics(): void {
        this.pixiElement.destroy({ children: true });
    }

    // ============================ UPDATE GRAPHICS ============================

    updateGraphics(): void {

    }

    updateOpacityLayerColor(backgroundColor: ColorSource): void {
        if (!this.opacityLayer) return;
        this.opacityLayer.clear();
        this.opacityLayer.drawFill(backgroundColor);
    }

    updateFillColor(): void {

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

    // ================================== PIN ==================================

    pin(): void {
        const icon = this.pixiElement.getChildByName("pin");
        if (icon) return;
        const svg = getIcon("pin");
        if (svg) {
            const bodyStyle = getComputedStyle(document.body);
            const stroke = bodyStyle.getPropertyValue("--color-base-00");

            const tail = svg.getElementsByTagName("path")[0];
            const head = svg.getElementsByTagName("path")[1];
            head.setAttribute("fill", PluginInstances.app.getAccentColor());
            head.setAttribute("stroke", stroke);
            tail.setAttribute("stroke", PluginInstances.app.getAccentColor());

            const s = new XMLSerializer();
            const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.serializeToString(svg))}`
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
        if (icon) {
            icon.destroy();
            this.pixiElement.removeChild(icon);
        }
    }

    // ================================= COLOR =================================

    getFillColor(): GraphColorAttributes {
        return this.extendedElement.coreElement.getFillColor();
    }

}

