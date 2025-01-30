import { GraphColorAttributes, GraphLink } from "obsidian-typings";
import { Container } from "pixi.js";
import { CurveLinkGraphicsWrapper, ExtendedGraphElement, GraphInstances, InteractiveManager, LineLinkGraphicsWrapper, LinkGraphics, LinkGraphicsWrapper, PluginInstances } from "src/internal";


export class ExtendedGraphLink extends ExtendedGraphElement<GraphLink> {
    name: string;
    graphicsWrapper?: LinkGraphicsWrapper<LinkGraphics>;

    // ============================== CONSTRUCTOR ==============================

    constructor(instances: GraphInstances, link: GraphLink, types: Map<string, Set<string>>, managers: InteractiveManager[]) {
        super(instances, link, types, managers);
        this.initGraphicsWrapper();
    }

    protected override initGraphicsWrapper(): void {
        super.initGraphicsWrapper();
        this.changeCoreLinkThickness();
    }

    protected override needGraphicsWrapper(): boolean {
        if (this.instances.settings.enableFeatures[this.instances.type]['links'] && this.instances.settings.enableFeatures[this.instances.type]['curvedLinks']) {
            return true;
        }
        for (const [key, manager] of this.managers) {
            const types = this.types.get(key);
            if (!types || types.size === 0) continue;
            if (this.instances.settings.interactiveSettings[key].showOnGraph && !types.has(this.instances.settings.interactiveSettings[key].noneType)) {
                return true;
            }
        }
        return false;
    }

    protected override createGraphicsWrapper(): void {
        if (this.instances.settings.enableFeatures[this.instances.type]['curvedLinks']) {
            this.graphicsWrapper = new CurveLinkGraphicsWrapper(this);
        }
        else {
            this.graphicsWrapper = new LineLinkGraphicsWrapper(this);
        }
        this.graphicsWrapper.initGraphics();

        let layer = 1;
        for (const [key, manager] of this.managers) {
            if (!this.instances.settings.interactiveSettings[key].showOnGraph) continue;
            const validTypes = this.getTypes(key);
            this.graphicsWrapper.createManagerGraphics(manager, validTypes, layer);
            layer++;
        }
    }

    // ========================= LINK SIZE (THICKNESS) =========================

    changeCoreLinkThickness(): void {
        if (this.coreElement.px
            && PluginInstances.settings.enableFeatures[this.instances.type]['elements-stats']
            && PluginInstances.settings.linksSizeFunction !== "default"
            && !this.instances.settings.enableFeatures[this.instances.type]['curvedLinks']) {
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
        return PluginInstances.settings.enableFeatures[this.instances.type]['elements-stats'] ?
            PluginInstances.graphsManager.linksSizeCalculator
                ?.linksStats[this.coreElement.source.id][this.coreElement.target.id]?.value
                ?? 1
            : 1;
    }

    // ============================== LINK COLOR ===============================

    getStrokeColor(): number | undefined {
        //console.log(PluginInstances.graphsManager.linksColorCalculator?.linksStats[this.coreElement.source.id][this.coreElement.target.id]);
        return PluginInstances.settings.enableFeatures[this.instances.type]['elements-stats'] ?
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

    // ================================ GETTERS ================================

    getID(): string {
        return getLinkID(this.coreElement);
    }

    // ================================ TOGGLE =================================

    override enable(): void {
        super.enable();
        this.changeCoreLinkThickness();
    }

    override disable() {
        super.disable();
        this.graphicsWrapper?.disconnect();
    }
}

export function getLinkID(link: {source: {id: string}, target: {id: string}}): string {
    return link.source.id + "--to--" + link.target.id;
}