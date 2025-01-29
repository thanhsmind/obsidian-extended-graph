import { GraphLink } from "obsidian-typings";
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

    protected needGraphicsWrapper(): boolean {
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

    protected createGraphicsWrapper(): void {
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

    getSize(): number {
        const customFunctionFactor = PluginInstances.graphsManager.linksSizeCalculator
            ?.linksStats[this.coreElement.source.id][this.coreElement.target.id];
        const originalWidth = this.coreElement.renderer.fLineSizeMult;
        return originalWidth * (customFunctionFactor ?? 1);
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

    protected override setCoreParentGraphics(coreElement: GraphLink): void {
        if (this.instances.settings.enableFeatures[this.instances.type]['curvedLinks']) {
            this.coreElement.px = coreElement.px;
        }
        else {
            this.coreElement.line = coreElement.line;
        }
    }

    // ================================ GETTERS ================================

    getID(): string {
        return getLinkID(this.coreElement);
    }

    // ================================ TOGGLE =================================

    override disable() {
        super.disable();
        this.graphicsWrapper?.disconnect();
    }
}

export function getLinkID(link: {source: {id: string}, target: {id: string}}): string {
    return link.source.id + "--to--" + link.target.id;
}