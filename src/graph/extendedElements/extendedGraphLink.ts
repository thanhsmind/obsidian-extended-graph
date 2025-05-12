import { OutlineFilter } from "@pixi/filter-outline";
import { GraphLink } from "obsidian-typings";
import { Container } from "pixi.js";
import { CurveLinkGraphicsWrapper, ExtendedGraphArrow, ExtendedGraphElement, getPrimaryColor, hex2int, LINK_KEY, PluginInstances, rgb2int, SettingQuery } from "src/internal";


export class ExtendedGraphLink extends ExtendedGraphElement<GraphLink> {
    name: string;
    graphicsWrapper?: CurveLinkGraphicsWrapper;
    hasChangedArrowShape: boolean = false;
    extendedArrow?: ExtendedGraphArrow;
    siblingLink?: ExtendedGraphLink;
    container?: Container;

    protected override additionalConstruct() {
        if (SettingQuery.needToChangeArrow(this.instances)) {
            this.extendedArrow = new ExtendedGraphArrow(this.instances, this);
        }
    }


    // ======================== MODIFYING CORE ELEMENT =========================

    override init(): void {
        this.findSiblingLink();
        super.init();
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
        this.createContainer();
    }

    override restoreCoreElement(): void {
        this.restoreCoreLinkThickness();
        PluginInstances.proxysManager.unregisterProxy(this.coreElement.line);
        this.extendedArrow?.unload();
        this.removeContainer();
    }

    // =============================== GRAPHICS ================================


    protected override needGraphicsWrapper(): boolean {
        if (this.instances.settings.enableFeatures[this.instances.type]['links'] && this.instances.settings.curvedLinks) {
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
                    && !this.instances.settings.curvedLinks)
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

    // ============================= LINK CONTAINER =============================

    private createContainer(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['links']
            || !this.instances.settings.outlineLinks
        ) return;

        let container: Container;
        if (this.siblingLink?.container) {
            container = this.siblingLink.container;
        }
        else {
            this.container = new Container();
            container = this.container;
        }
        if (this.coreElement.px) {
            this.coreElement.px.removeFromParent();
            container.addChild(this.coreElement.px);
            this.coreElement.px.addListener('destroyed', this.removeContainer);
        }
        if (this.coreElement.arrow) {
            this.coreElement.arrow.removeFromParent();
            container.addChild(this.coreElement.arrow);
            this.coreElement.arrow.addListener('destroyed', this.removeContainer);
        }
        container.filters = [new OutlineFilter(
            1, rgb2int(getPrimaryColor(this.coreElement.renderer)), 0.1, 1, false
        )];
        this.coreElement.renderer.hanger.addChild(container);
    }

    private removeContainer(): void {
        if (!this.coreElement) return;

        if (this.coreElement.px) {
            this.coreElement.px.removeEventListener('destroyed', this.removeContainer);
        }
        if (this.coreElement.arrow) {
            this.coreElement.arrow.removeEventListener('destroyed', this.removeContainer);
        }

        if (!this.container) return;

        for (const child of this.container.children.filter(c => !c.destroyed)) {
            this.coreElement.renderer.hanger.addChild(child);
        }
        this.container.destroy();
        this.container = undefined;
    }

    // ============================== LINK COLOR ===============================

    private proxyLine(): void {
        if (!SettingQuery.needToChangeLinkColor(this.instances)) return;
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
        if (this.instances.settings.enableFeatures[this.instances.type]['links']
            && this.instances.settings.interactiveSettings[LINK_KEY].showOnGraph
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
        if (this.instances.settings.enableFeatures[this.instances.type]['linksSameColorAsNode']) {
            if (this.instances.settings.enableFeatures[this.instances.type]['arrows']
                && this.instances.settings.invertArrows
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
        if (this.instances.settings.curvedLinks) {
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
        if (this.instances.settings.curvedLinks) {
            this.graphicsWrapper?.disconnect();
        }
    }
}

export function getLinkID(link: { source: { id: string }, target: { id: string } }): string {
    return link.source.id + "--to--" + link.target.id;
}