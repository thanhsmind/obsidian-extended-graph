import { GraphLink } from "obsidian-typings";
import { Container } from "pixi.js";
import { CurveLinkGraphicsWrapper, ExtendedGraphArrow, ExtendedGraphElement, LINK_KEY, PluginInstances, rgb2int } from "src/internal";


export class ExtendedGraphLink extends ExtendedGraphElement<GraphLink> {
    name: string;
    graphicsWrapper?: CurveLinkGraphicsWrapper;
    hasChangedArrowShape: boolean = false;
    extendedArrow?: ExtendedGraphArrow;
    siblingLink?: ExtendedGraphLink;

    protected override additionalConstruct() {
        if (this.needToModifyArrow()) {
            this.extendedArrow = new ExtendedGraphArrow(this.instances, this.coreElement);
        }
    }

    private needToModifyArrow(): boolean {
        return this.instances.settings.enableFeatures[this.instances.type]['arrows']
            && (this.instances.settings.invertArrows || this.instances.settings.flatArrows
                || this.instances.settings.colorArrows || this.instances.settings.opaqueArrows);
    }


    // ======================== MODIFYING CORE ELEMENT =========================

    override init(): void {
        super.init();
        this.findSiblingLink();
        this.extendedArrow?.init();
    }

    private findSiblingLink(): void {
        const siblingID = getLinkID({ source: { id: this.coreElement.target.id }, target: { id: this.coreElement.source.id } })
        this.siblingLink = this.instances.linksSet.extendedElementsMap.get(siblingID);
        if (this.siblingLink) {
            this.siblingLink.siblingLink = this;
        }
    }

    override modifyCoreElement(): void {
        this.changeCoreLinkThickness();
        this.proxyLine();
    }

    override restoreCoreElement(): void {
        this.restoreCoreLinkThickness();
        PluginInstances.proxysManager.unregisterProxy(this.coreElement.line);
        this.extendedArrow?.unload();
    }

    // =============================== GRAPHICS ================================


    protected override needGraphicsWrapper(): boolean {
        if (this.instances.settings.enableFeatures[this.instances.type]['links'] && this.instances.settings.enableFeatures[this.instances.type]['curvedLinks']) {
            (this.id, "Needs graphics wrapper");
            return true; // Always for curved links
        }
        return false;
    }

    protected override createGraphicsWrapper(): void {
        if (!this.graphicsWrapper) {
            this.graphicsWrapper = new CurveLinkGraphicsWrapper(this);
            this.graphicsWrapper.createGraphics();
        }
    }

    // ========================= LINK SIZE (THICKNESS) =========================

    changeCoreLinkThickness(): void {
        if (this.coreElement.px
            && PluginInstances.settings.enableFeatures[this.instances.type]['elements-stats']
            && PluginInstances.settings.linksSizeFunction !== "default"
            && (
                (PluginInstances.settings.enableFeatures[this.instances.type]['links']
                    && !this.instances.settings.enableFeatures[this.instances.type]['curvedLinks'])
                || (!PluginInstances.settings.enableFeatures[this.instances.type]['links']))) {
            this.coreElement.px.scale.y = this.getThicknessScale();
        }
        else {
            this.restoreCoreLinkThickness();
        }
    }

    private restoreCoreLinkThickness(): void {
        if (this.coreElement.px) {
            this.coreElement.px.scale.y = 1;
        }
    }

    getThicknessScale(): number {
        return PluginInstances.settings.enableFeatures[this.instances.type]['elements-stats']
            && PluginInstances.settings.linksColorFunction !== "default" ?
            PluginInstances.graphsManager.linksSizeCalculator
                ?.linksStats[this.coreElement.source.id][this.coreElement.target.id]?.value
            ?? 1
            : 1;
    }

    // ============================== LINK COLOR ===============================

    private needToChangeColor(): boolean {
        if (PluginInstances.settings.enableFeatures[this.instances.type]['links']
            && PluginInstances.settings.interactiveSettings[LINK_KEY].showOnGraph
        ) return true;

        if (PluginInstances.settings.enableFeatures[this.instances.type]['elements-stats']
            && PluginInstances.settings.linksColorFunction !== "default"
        ) return true;

        if (PluginInstances.settings.linksSameColorAsNode) return true;

        return false;
    }

    private proxyLine(): void {
        if (!this.needToChangeColor()) return;
        const link = this.coreElement
        if (link.line) {
            const getStrokeColor = this.getStrokeColor.bind(this);
            PluginInstances.proxysManager.registerProxy<typeof link.line>(
                this.coreElement,
                'line',
                {
                    set(target, p, newValue, receiver) {
                        if (p === 'tint') {
                            newValue = getStrokeColor() ?? newValue;
                        }
                        return Reflect.set(target, p, newValue, receiver);
                    },
                }
            );
            link.line.on('destroyed', () => PluginInstances.proxysManager.unregisterProxy(this.coreElement.line));
        }
    }

    isHighlighted(): boolean {
        return this.coreElement.source === this.coreElement.renderer.getHighlightNode() || this.coreElement.target === this.coreElement.renderer.getHighlightNode();
    }

    getStrokeColor(): number | undefined {
        if (this.isHighlighted()) {
            return;
        }

        let color: number | undefined;

        // From type
        if (PluginInstances.settings.enableFeatures[this.instances.type]['links']
            && PluginInstances.settings.interactiveSettings[LINK_KEY].showOnGraph
        ) {
            const manager = this.managers.get(LINK_KEY);
            const type = this.getActiveType(LINK_KEY);
            if (manager && type) {
                color = rgb2int(manager.getColor(type));
                return color
            }
        }

        // From color stats
        if (PluginInstances.settings.enableFeatures[this.instances.type]['elements-stats']
            && PluginInstances.settings.linksColorFunction !== "default"
        ) {
            color = PluginInstances.graphsManager.linksColorCalculator
                ?.linksStats[this.coreElement.source.id][this.coreElement.target.id]?.value;

            if (color) return color;
        }

        // From source node
        if (PluginInstances.settings.linksSameColorAsNode) {
            if (PluginInstances.settings.enableFeatures[this.instances.type]['arrows']
                && PluginInstances.settings.invertArrows
            ) {
                color = this.coreElement.target.getFillColor().rgb;
            }
            else {
                color = this.coreElement.source.getFillColor().rgb;
            }
            return color;
        }
    }

    // ============================== CORE ELEMENT =============================

    protected override isCoreElementUptodate(): boolean {
        return !!this.coreElement.line;
    }

    override isSameCoreElement(link: GraphLink): boolean {
        return link.source.id === this.coreElement.source.id && link.target.id === this.coreElement.target.id;
    }

    protected override isSameCoreGraphics(coreElement: GraphLink): boolean {
        return coreElement.line === this.coreElement.line;
    }

    override getCoreCollection(): GraphLink[] {
        return this.coreElement.renderer.links;
    }

    protected override getCoreParentGraphics(coreElement: GraphLink): Container | null {
        if (this.instances.settings.enableFeatures[this.instances.type]['curvedLinks']) {
            return coreElement.px;
        }
        else {
            return coreElement.line;
        }
    }

    override canBeAddedWithEngineOptions(): boolean {
        const extendedSource = this.instances.nodesSet.extendedElementsMap.get(this.coreElement.source.id);
        const extendedTarget = this.instances.nodesSet.extendedElementsMap.get(this.coreElement.target.id);
        if (!extendedSource || !extendedTarget) return false;

        return extendedSource.canBeAddedWithEngineOptions() && extendedTarget.canBeAddedWithEngineOptions();
    }

    override setCoreElement(coreElement: GraphLink | undefined): void {
        if (coreElement && this.extendedArrow) {
            this.extendedArrow.coreElement = coreElement;
        }
        super.setCoreElement(coreElement);
    }

    // ================================ GETTERS ================================

    getID(): string {
        return getLinkID(this.coreElement);
    }

    override disableType(key: string, type: string): void {
        super.disableType(key, type);
        if (this.isAnyManagerDisabled()) {
            this.disable();
        }
    }

    override disable(): void {
        super.disable();
        this.extendedArrow?.unload();
        if (this.instances.settings.enableFeatures[this.instances.type]['curvedLinks']) {
            this.graphicsWrapper?.disconnect();
        }
    }
}

export function getLinkID(link: { source: { id: string }, target: { id: string } }): string {
    return link.source.id + "--to--" + link.target.id;
}