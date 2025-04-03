import { getIcon } from 'obsidian';
import { Assets, ColorSource, Container, Sprite, Text, Texture } from 'pixi.js';
import { GraphColorAttributes, GraphNode } from 'obsidian-typings';
import { ExtendedGraphNode, getBackgroundColor, getFile, getListOfSubpaths, getSvgFromIconic, getSvgFromIconize, GraphicsWrapper, IconicPlugin, IconizePlugin, int2hex, NodeShape, PluginInstances, QueryData, QueryMatcher, ShapeEnum } from 'src/internal';

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

    private initIcon() {
        let svg: SVGSVGElement | null = null;
        let color: string | null = null;
        let emoji: string | null = null;

        // Recursively get icon for file, or if it doesn't exist, for parent folders
        const fullpath = this.extendedElement.id; // full path with filename
        // list of subpaths, removing the last element each time

        const paths = getListOfSubpaths(fullpath).reverse();
        for (const path of paths) {
            const fromIconic = getSvgFromIconic(path);
            if (fromIconic) {
                svg = fromIconic.svg;
                color = fromIconic.color;
                emoji = fromIconic.emoji;
                break;
            }
            else {
                const fromIconize = getSvgFromIconize(path);
                if (fromIconize) {
                    svg = fromIconize.svg;
                    color = fromIconize.color;
                    emoji = fromIconize.emoji;
                    break;
                }
            }
        }

        // If an svg was found, create an asset and use it
        if (svg) {
            svg.setAttribute("stroke", "white");
            const s = new XMLSerializer();
            const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.serializeToString(svg))}`;

            this.pixiElement.sortableChildren = true;
            const createSprite = (texture: Texture) => {
                const sprite = new Sprite(texture);
                sprite.name = "icon";
                sprite.anchor.set(0.5, 0.5);
                sprite.height = 200;
                sprite.width = 200;
                sprite.tint = color || this.getFillColor().rgb;
                this.pixiElement.addChild(sprite);
            }

            // Lower resolution, better performance
            /*Assets.load(svgDataUrl).then(texture => {
                createSprite(texture);
            });*/

            // Higher resolution, worse performance
            const texture = Texture.from(svgDataUrl, { resourceOptions: { scale: 40 / svg.width.baseVal.value } });
            createSprite(texture);
        }

        // If an emoji was found, create a text element
        else if (emoji) {
            const emojiText = new Text(emoji, {
                fontFamily: "Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji, Android Emoji, EmojiSymbols, Symbola, Twemoji Mozilla, Twemoji Mozilla Color Emoji, Twemoji Mozilla Color Emoji 13.1.0",
                fontSize: 150,
                align: "center",
            });
            emojiText.name = "icon";
            emojiText.anchor.set(0.5, 0.5);
            this.pixiElement.addChild(emojiText);
        }

        // Hide circle
        if (svg || emoji) {
            this.iconBackgroundLayer = new NodeShape(this.shape);
            this.iconBackgroundLayer.drawFill(getBackgroundColor(this.extendedElement.coreElement.renderer));
            this.iconBackgroundLayer.scale.set(this.iconBackgroundLayer.getDrawingResolution() + 0.5);
            this.iconBackgroundLayer.alpha = 10;
            this.iconBackgroundLayer.zIndex = -1;
            this.pixiElement.addChildAt(this.iconBackgroundLayer, 0);
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

