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
    GraphInstances,
    InteractiveManager,
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
    extendedText: ExtendedGraphText;

    // Size
    graphicsWrapperScale: number = 1;
    radius: number = NodeShape.RADIUS;

    // icon
    icon: {
        svg: SVGSVGElement | null,
        color: string | null,
        emoji: string | null
    } | null = null;

    // ============================== CONSTRUCTOR ==============================

    constructor(instances: GraphInstances, node: GraphNode, types: Map<string, Set<string>>, managers: InteractiveManager[]) {
        super(instances, node, types, managers);
        this.extendedText = new ExtendedGraphText(instances, node);
        this.computeRadius();
    }


    // ======================== MODIFYING CORE ELEMENT =========================

    override modifyCoreElement(): void {
        this.proxyGetSize();
        this.proxyClearGraphics();
        this.proxyGetFillColor();

        this.coreElement.circle?.addListener('destroyed', () => this.restoreCoreElement());
    }

    private proxyGetSize() {
        if (!(this.graphicsWrapper && this.graphicsWrapper.shape !== ShapeEnum.CIRCLE)
            && !(this.instances.settings.enableFeatures[this.instances.type]["elements-stats"]
                && PluginInstances.settings.nodesSizeFunction !== "default")) {
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

    private proxyClearGraphics(): void {
        if (this.instances.settings.enableFeatures[this.instances.type]['names']
            && this.instances.settings.nameVerticalOffset !== 0) {

            const extendedText = this.extendedText;

            const proxy = PluginInstances.proxysManager.registerProxy<typeof this.coreElement.clearGraphics>(
                this.coreElement,
                "clearGraphics",
                {
                    apply(target, thisArg, argArray) {
                        // Later, if we need to do different things before clearGraphics,
                        // add "if" tests
                        extendedText.disable();

                        return Reflect.apply(target, thisArg, argArray);
                    },
                });
            this.coreElement.circle?.addListener('destroyed', () => PluginInstances.proxysManager.unregisterProxy(proxy));
        }

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
        PluginInstances.proxysManager.unregisterProxy(this.coreElement.clearGraphics);
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
        this.getIcon();
        return this.needPin() || this.needOpacityLayer() || !!this.icon;
    }

    public needOpacityLayer(): boolean { return this.instances.settings.fadeOnDisable; }

    public needPin(): boolean { return true; }

    public needIcon(): boolean { return this.instances.settings.enableFeatures[this.instances.type]['icons']; }

    public getIcon() {
        if (!this.needIcon()) return;
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
        this.graphicsWrapper?.pin();
    }

    unpin(): void {
        this.isPinned = false;
        this.graphicsWrapper?.unpin();
    }
}