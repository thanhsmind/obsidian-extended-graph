import { getIcon } from "obsidian";
import { GraphColorAttributes, GraphNode } from "obsidian-typings";
import { Graphics, Sprite, Texture, Text, ColorSource } from "pixi.js";
import { getFile, getFileInteractives } from "src/helpers/vault";
import { ExtendedGraphElement, getBackgroundColor, getListOfSubpaths, getSvgFromIconic, getSvgFromIconize, GraphInstances, InteractiveManager, isEmoji, isNumber, NodeGraphicsWrapper, NodeShape, Pinner, PluginInstances, ShapeEnum } from "src/internal";

export abstract class ExtendedGraphNode extends ExtendedGraphElement<GraphNode> {
    graphicsWrapper?: NodeGraphicsWrapper;
    isPinned: boolean = false;
    coreGetFillColor: (() => GraphColorAttributes) | undefined;
    originalText: string | null = null;

    // Size
    graphicsWrapperScale: number = 1;
    radius: number = NodeShape.RADIUS;
    coreGetSize?: () => number;

    // icon
    icon: {
        svg: SVGSVGElement | null,
        color: string | null,
        emoji: string | null
    } | null = null;

    // name
    textBackground: Sprite | null = null;
    textClone: Text | null = null;

    // ============================== CONSTRUCTOR ==============================

    constructor(instances: GraphInstances, node: GraphNode, types: Map<string, Set<string>>, managers: InteractiveManager[]) {
        super(instances, node, types, managers);

        this.initRadius();
        this.changeGetSize();
        this.initGraphicsWrapper();
        this.updateFontFamily();
        this.updateText();
        if (this.instances.settings.enableFeatures[instances.type]['names'] && this.instances.settings.addBackgroundToName) this.addBackgroundToText();
    }

    // ================================ UNLOAD =================================

    override unload() {
        if (this.isPinned) {
            new Pinner(this.instances).unpinNode(this.id);
        }
        this.restoreGetSize();
        this.resetText();
        super.unload();
    }

    // =============================== GRAPHICS ================================

    protected needGraphicsWrapper(): boolean {
        this.getIcon();
        return this.needPin() || this.needOpacityLayer() || !!this.icon;
    }

    public needOpacityLayer(): boolean { return this.instances.settings.fadeOnDisable; }

    public needPin(): boolean { return true; }

    public needIcon(): boolean { return this.instances.settings.enableFeatures[this.instances.type]['icons']; }

    public getIcon() {
        // Recursively get icon for file, or if it doesn't exist, for parent folders
        const paths = this.instances.settings.useParentIcon ? getListOfSubpaths(this.id).reverse() : [this.id];

        // try to find in properties
        if (this.instances.settings.iconProperty !== "") {
            const file = getFile(this.id);
            if (file) {
                const iconList = getFileInteractives(this.instances.settings.iconProperty, file);
                for (const iconString of iconList) {
                    if (isEmoji(iconString)) {
                        this.icon = { svg: null, color: null, emoji: iconString };
                        break;
                    }
                    const svg = getIcon(iconString);
                    if (svg) {
                        svg.setAttribute("stroke", "white");
                        this.icon = { svg: svg, color: null, emoji: null };
                        break;
                    }
                }
            }
        }

        // try to find with plugins
        if (!this.icon && this.instances.settings.usePluginForIcon) {
            for (const path of paths) {
                this.icon = getSvgFromIconic(path);
                if (!this.icon) {
                    this.icon = getSvgFromIconize(path);
                }
                if (this.icon) {
                    break;
                }
            }
            this.icon?.svg?.setAttribute("stroke", "white");
        }
        if (this.icon && !this.instances.settings.usePluginForIconColor) {
            this.icon.color = null;
        }

        if (this.icon && this.icon.svg == null && this.icon.emoji == null) this.icon = null;

        return this.icon;
    }

    protected abstract createGraphicsWrapper(): void;

    // =============================== NODE SIZE ===============================

    private initRadius() {
        if (!this.instances.settings.enableFeatures[this.instances.type]['elements-stats']) return;

        const property = this.instances.settings.nodesSizeProperty;
        if (!property || property === "") return;

        const file = getFile(this.id);
        if (!file) return;

        const values = getFileInteractives(property, file);
        for (const value of values) {
            if (isNumber(value)) {
                this.radius = parseInt(value);
                if (isNaN(this.radius)) this.radius = NodeShape.RADIUS;
                break;
            }
        }
    }

    changeGetSize() {
        if (!(this.graphicsWrapper && this.graphicsWrapper.shape !== ShapeEnum.CIRCLE)
            && !(this.instances.settings.enableFeatures[this.instances.type]["elements-stats"] && PluginInstances.settings.nodesSizeFunction !== "default")) {
            this.restoreGetSize();
            return;
        }
        if (this.coreGetSize) {
            return;
        }
        this.coreGetSize = this.coreElement.getSize;
        const getSize = this.getSize.bind(this);
        this.coreElement.getSize = new Proxy(this.coreElement.getSize, {
            apply(target, thisArg, args) {
                return getSize.call(this, ...args)
            }
        });
    }

    private restoreGetSize() {
        if (!this.coreGetSize) return;
        this.coreElement.getSize = this.coreGetSize;
        this.coreGetSize = undefined;
    }

    getSize(): number {
        return this.getSizeWithoutScaling() * this.graphicsWrapperScale;
    }

    getSizeWithoutScaling(): number {
        const customRadiusFactor = this.radius / NodeShape.RADIUS;
        const node = this.coreElement;
        if (this.instances.settings.enableFeatures[this.instances.type]['elements-stats'] && this.instances.settings.nodesSizeFunction !== 'default') {
            const originalSize = node.renderer.fNodeSizeMult * 8;
            const customFunctionFactor = PluginInstances.graphsManager.nodesSizeCalculator?.filesStats.get(this.id)?.value;
            return originalSize * customRadiusFactor * (customFunctionFactor ?? 1);
        }
        else {
            const originalSize = node.renderer.fNodeSizeMult * Math.max(8, Math.min(3 * Math.sqrt(node.weight + 1), 30));
            return originalSize * customRadiusFactor;
        }
    }

    // ============================== NODE COLOR ===============================

    changeGetFillColor(): void { }
    restoreGetFillColor(): void { }
    protected getFillColor(): GraphColorAttributes | undefined { return; };

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

    override setCoreElement(coreElement: GraphNode | undefined): void {
        super.setCoreElement(coreElement);
        if (coreElement) {
            this.updateFontFamily();
        }
    }

    protected override getCoreParentGraphics(coreElement: GraphNode): Graphics | null {
        return coreElement.circle;
    }

    // ================================= TEXT ==================================

    updateFontFamily(): void {
        if (!this.coreElement.text) return;
        const style = window.getComputedStyle(this.coreElement.renderer.interactiveEl);
        const fontInterface = style.getPropertyValue("--font-interface");
        const fontNode = (typeof this.coreElement.text.style.fontFamily === "string")
            ? this.coreElement.text.style.fontFamily
            : this.coreElement.text.style.fontFamily.join(', ');
        if (fontNode !== fontInterface) {
            const textStyle = this.coreElement.text.style;
            textStyle.fontFamily = fontInterface;
            this.coreElement.text.style = textStyle;
        }
    }

    updateText(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['names'] || !this.coreElement.text || this.originalText !== null) return;

        let text = this.coreElement.text.text;

        if (this.instances.settings.usePropertyForName) {
            const file = getFile(this.id);
            if (file) {
                const values = getFileInteractives(this.instances.settings.usePropertyForName, file);
                for (const value of values) {
                    if (value !== undefined && value !== null) {
                        text = value.toString();
                        break;
                    }
                }
            }
        }

        if (this.instances.settings.showOnlyFileName) {
            text = text.split("/").last() || text;
        }

        if (this.instances.settings.noExtension) {
            text = text.replace(/\.[^/.]+$/, "");
        }

        if (this.instances.settings.numberOfCharacters && this.instances.settings.numberOfCharacters > 0) {
            text = text.slice(0, this.instances.settings.numberOfCharacters);
        }

        if (text !== this.coreElement.text.text) {
            this.originalText = this.coreElement.text.text;
            this.coreElement.text.text = text;
        }
    }

    resetText(): void {
        if (this.coreElement.text && this.originalText !== null) {
            this.coreElement.text.text = this.originalText;
            this.originalText = null;
        }
        if (this.textBackground) {
            this.textBackground.removeFromParent();
            this.textBackground.destroy(true);
            this.textBackground = null;
        }
        if (this.textClone) {
            this.textClone.removeFromParent();
            this.textClone.destroy(true);
            this.textClone = null;
        }
    }

    addBackgroundToText(): void {
        if (!this.coreElement.text) return;
        this.textBackground = new Sprite(Texture.WHITE);
        this.textBackground.width = (this.coreElement.text.getBounds().width + this.coreElement.text.width) / 2;
        this.textBackground.height = (this.coreElement.text.getBounds().height + this.coreElement.text.height) / 2;
        this.textBackground.anchor.set(0.5, 0);
        this.textBackground.tint = getBackgroundColor(this.coreElement.renderer);
        this.textBackground.tint = "red";
        this.textBackground.alpha = 2;
        this.textClone = new Text(this.coreElement.text.text, this.coreElement.text.style);
        this.textClone.anchor.set(0.5, 0);
        this.coreElement.text.addChild(this.textBackground);
        this.coreElement.text.addChild(this.textClone);
    }

    updateTextBackgroundColor(backgroundColor: ColorSource): void {
        if (!this.textBackground) return;
        this.textBackground.tint = backgroundColor;
        if (this.textClone && this.coreElement.text) {
            // @ts-ignore
            this.textClone.style.fill = this.coreElement.getTextStyle().fill;
        }
        console.log(this.coreElement.getSize());
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