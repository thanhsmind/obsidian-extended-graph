import { GraphLink } from "obsidian-typings";
import { Container } from "pixi.js";
import { CurveLinkGraphicsWrapper, ExtendedGraphArrow, ExtendedGraphElement, GraphInstances, InteractiveManager, LineLinkGraphicsWrapper, LinkGraphics, LinkGraphicsWrapper, PluginInstances } from "src/internal";


export class ExtendedGraphLink extends ExtendedGraphElement<GraphLink> {
    name: string;
    graphicsWrapper?: LinkGraphicsWrapper<LinkGraphics>;
    hasChangedArrowShape: boolean = false;
    extendedArrow: ExtendedGraphArrow;

    protected override additionalConstruct() {
        this.extendedArrow = new ExtendedGraphArrow(this.instances, this.coreElement);
    }


    // ======================== MODIFYING CORE ELEMENT =========================

    override modifyCoreElement(): void {
        this.changeCoreLinkThickness();
        this.extendedArrow.modifyCoreElement();
    }

    override restoreCoreElement(): void {
        this.restoreCoreLinkThickness();
        this.extendedArrow.unload();
    }

    // =============================== GRAPHICS ================================


    protected override needGraphicsWrapper(): boolean {
        if (this.instances.settings.enableFeatures[this.instances.type]['links'] && this.instances.settings.enableFeatures[this.instances.type]['curvedLinks']) {
            return true; // Always for curved links
        }
        if (this.instances.settings.enableFeatures[this.instances.type]['links'] && this.getStrokeColor()) {
            return true; // Always if the colos has to be overriden by the stat
        }
        for (const [key, manager] of this.managers) {
            const types = this.types.get(key);
            if (!types || types.size === 0) continue;
            if (this.instances.settings.interactiveSettings[key].showOnGraph && !types.has(this.instances.settings.interactiveSettings[key].noneType)) {
                return true; // If an active type must be shown and is not "none"
            }
        }
        return false;
    }

    protected override createGraphicsWrapper(): void {
        if (!this.graphicsWrapper) {
            if (this.instances.settings.enableFeatures[this.instances.type]['curvedLinks']) {
                this.graphicsWrapper = new CurveLinkGraphicsWrapper(this);
            }
            else {
                this.graphicsWrapper = new LineLinkGraphicsWrapper(this);
            }
        }
        this.graphicsWrapper.createGraphics();
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

    restoreCoreLinkThickness(): void {
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

    getStrokeColor(): number | undefined {
        return PluginInstances.settings.enableFeatures[this.instances.type]['elements-stats']
            && PluginInstances.settings.linksColorFunction !== "default" ?
            PluginInstances.graphsManager.linksColorCalculator
                ?.linksStats[this.coreElement.source.id][this.coreElement.target.id]?.value
            : undefined;
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
        if (coreElement) {
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
        if (this.instances.settings.enableFeatures[this.instances.type]['curvedLinks']) {
            if (this.isAnyManagerDisabled()) {
                this.disable();
            }
        }
    }

    override disable(): void {
        super.disable();
        this.graphicsWrapper?.disconnect();
    }
}

export function getLinkID(link: { source: { id: string }, target: { id: string } }): string {
    return link.source.id + "--to--" + link.target.id;
}