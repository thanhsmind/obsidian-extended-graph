import { getIcon } from "obsidian";
import { GraphColorAttributes, GraphNode } from "obsidian-typings";
import { Graphics } from "pixi.js";
import { getFile, getFileInteractives } from "src/helpers/vault";
import {
    ExtendedGraphElement,
    ExtendedGraphText,
    getListOfSubpaths,
    getSvgFromIconic,
    getSvgFromIconize,
    isEmoji,
    isNumber,
    NodeGraphicsWrapper,
    NodeShape,
    Pinner,
    PluginInstances,
    ShapeEnum
} from "src/internal";

export abstract class ExtendedGraphNode extends ExtendedGraphElement<GraphNode> {
    graphicsWrapper?: NodeGraphicsWrapper;
    isPinned: boolean = false;
    pinnedPosition?: { x: number, y: number };
    extendedText: ExtendedGraphText;

    // Size
    graphicsWrapperScale: number = 1;
    radius: number;

    // icon
    icon: {
        svg: SVGSVGElement | null,
        color: string | null,
        emoji: string | null
    } | null;

    // ============================== CONSTRUCTOR ==============================

    protected override additionalConstruct() {
        this.extendedText = new ExtendedGraphText(this.instances, this.coreElement);
        this.getIcon();
        this.radius = NodeShape.RADIUS;
        this.computeRadius();
    }


    // ======================== MODIFYING CORE ELEMENT =========================

    override init(): void {
        super.init();
        if (this.isPinned && this.pinnedPosition) {
            const pinner = new Pinner(this.instances);
            pinner.pinNode(this.id, this.pinnedPosition.x, this.pinnedPosition.y);
        }
        this.extendedText.init();
    }

    override modifyCoreElement(): void {
        this.proxyGetSize();
        this.proxyGetFillColor();

        this.coreElement.circle?.addListener('destroyed', () => this.restoreCoreElement());
    }

    private proxyGetSize() {
        if (!(this.graphicsWrapper && this.graphicsWrapper.shape !== ShapeEnum.CIRCLE)
            && (this.radius === NodeShape.RADIUS)
            && !(this.instances.settings.enableFeatures[this.instances.type]["elements-stats"]
                && this.instances.settings.nodesSizeFunction !== "default")) {
            return;
        }

        const getSize = this.getSize.bind(this);
        PluginInstances.proxysManager.registerProxy<typeof this.coreElement.getSize>(
            this.coreElement,
            "getSize",
            {
                apply(target, thisArg, args) {
                    return getSize.call(this, ...args)
                }
            }
        );
    }

    protected needToChangeColor(): boolean { return false; }
    protected needToUpdateGraphicsColor(): boolean { return false; }
    protected proxyGetFillColor(): void {
        const needToUpdateGraphicsColor = this.needToUpdateGraphicsColor();
        const needToChangeColor = this.needToChangeColor();
        if (!(needToUpdateGraphicsColor || needToChangeColor)) return;

        const onGetFillColorCalled = this.onGetFillColorCalled.bind(this);
        PluginInstances.proxysManager.registerProxy<typeof this.coreElement.getFillColor>(
            this.coreElement,
            "getFillColor",
            {
                apply(target, thisArg, args) {
                    return onGetFillColorCalled(needToUpdateGraphicsColor, needToChangeColor, target, thisArg, args);
                }
            }
        );
    }

    override restoreCoreElement(): void {
        PluginInstances.proxysManager.unregisterProxy(this.coreElement.getSize);
        PluginInstances.proxysManager.unregisterProxy(this.coreElement.getFillColor);
    }

    // ================================ UNLOAD =================================

    override unload() {
        if (this.isPinned) {
            new Pinner(this.instances).unpinNode(this.id);
        }
        this.extendedText.unload();
        super.unload();
    }

    // =============================== GRAPHICS ================================

    protected needGraphicsWrapper(): boolean {
        return this.needPin() || this.needOpacityLayer() || !!this.icon;
    }

    public needOpacityLayer(): boolean { return this.instances.settings.fadeOnDisable; }

    public needPin(): boolean { return true; }

    public needIcon(): boolean { return this.instances.settings.enableFeatures[this.instances.type]['icons']; }

    public getIcon(): void {
        if (!this.needIcon()) return;
        // Recursively get icon for file, or if it doesn't exist, for parent folders
        const paths = this.instances.settings.useParentIcon ? getListOfSubpaths(this.id).reverse() : [this.id];
        let icon: typeof this.icon | null = null;

        // try to find in properties
        if (this.instances.settings.iconProperty !== "") {
            const file = getFile(this.id);
            if (file) {
                const iconList = getFileInteractives(this.instances.settings.iconProperty, file);
                for (const iconString of iconList) {
                    if (isEmoji(iconString)) {
                        icon = { svg: null, color: null, emoji: iconString };
                        break;
                    }
                    const svg = getIcon(iconString);
                    if (svg) {
                        svg.setAttribute("stroke", "white");
                        icon = { svg: svg, color: null, emoji: null };
                        break;
                    }
                }
            }
        }

        // try to find with plugins
        if (!icon && this.instances.settings.usePluginForIcon) {
            for (const path of paths) {
                icon = getSvgFromIconic(path);
                if (!icon) {
                    icon = getSvgFromIconize(path);
                }
                if (icon) {
                    break;
                }
            }
            icon?.svg?.setAttribute("stroke", "white");
        }
        if (icon && !this.instances.settings.usePluginForIconColor) {
            icon.color = null;
        }

        if (this.icon && this.icon.svg == null && this.icon.emoji == null) this.icon = null;
        else this.icon = icon;
    }

    // =============================== NODE SIZE ===============================

    private computeRadius() {
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

    private getSize(): number {
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

    private onGetFillColorCalled(needToUpdateGraphicsColor: boolean, needToChangeColor: boolean, target: () => GraphColorAttributes, thisArg: any, args: any[]): GraphColorAttributes | undefined {

        // Get the original color and the override color
        const isHighlighted = this.coreElement.renderer.getHighlightNode() === this.coreElement;
        const isFocused = this.coreElement.type === "focused";
        const originalColor: GraphColorAttributes = Reflect.apply(target, thisArg, args);
        const overrideColor: GraphColorAttributes = (needToChangeColor && !(isFocused || isHighlighted)) ? (this.getFillColor.call(this, ...args) ?? originalColor) : originalColor;

        if (needToUpdateGraphicsColor) {
            this.graphicsWrapper?.updateFillColor(overrideColor.rgb);
        }

        return overrideColor;
    }

    protected getFillColor(): GraphColorAttributes | undefined { return; };

    // ============================== CORE ELEMENT =============================

    protected override isCoreElementUptodate(): boolean {
        return !!this.coreElement.circle;
    }

    override isSameCoreElement(node: GraphNode): boolean {
        return node.id === this.id;
    }

    protected override isSameCoreGraphics(coreElement: GraphNode): boolean {
        return coreElement.circle === this.coreElement.circle;
    }

    override getCoreCollection(): GraphNode[] {
        return this.coreElement.renderer.nodes;
    }

    override setCoreElement(coreElement: GraphNode | undefined): void {
        if (coreElement) {
            this.extendedText.coreElement = coreElement;
        }
        super.setCoreElement(coreElement);
    }

    protected override getCoreParentGraphics(coreElement: GraphNode): Graphics | null {
        return coreElement.circle;
    }

    override canBeAddedWithEngineOptions(): boolean {
        if (this.coreElement.type === "tag" && !this.instances.engine.getOptions().showTags) return false;
        if (this.coreElement.type === "attachment" && !this.instances.engine.getOptions().showAttachments) return false;
        if (this.coreElement.type === "unresolved" && this.instances.engine.getOptions().hideUnresolved) return false;

        return true;
    }


    // ================================ GETTERS ================================

    getID(): string {
        return this.coreElement.id;
    }

    // =============================== PIN NODES ===============================

    pin(): void {
        this.isPinned = true;
        this.pinnedPosition = { x: this.coreElement.x, y: this.coreElement.y };
        this.graphicsWrapper?.pin();
    }

    unpin(): void {
        this.isPinned = false;
        this.pinnedPosition = undefined;
        this.graphicsWrapper?.unpin();
    }
}