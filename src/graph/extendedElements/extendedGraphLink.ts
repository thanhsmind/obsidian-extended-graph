import { GraphLink } from "obsidian-typings";
import { Container, Graphics } from "pixi.js";
import { CurveLinkGraphicsWrapper, ExtendedGraphElement, GraphInstances, InteractiveManager, LineLinkGraphicsWrapper, LinkGraphics, LinkGraphicsWrapper, PluginInstances } from "src/internal";


export class ExtendedGraphLink extends ExtendedGraphElement<GraphLink> {
    name: string;
    graphicsWrapper?: LinkGraphicsWrapper<LinkGraphics>;
    hasChangedArrowShape: boolean = false;

    // ============================== CONSTRUCTOR ==============================

    constructor(instances: GraphInstances, link: GraphLink, types: Map<string, Set<string>>, managers: InteractiveManager[]) {
        super(instances, link, types, managers);
        this.initGraphicsWrapper();

        if (this.instances.settings.enableFeatures[this.instances.type]['arrows']) {
            if (this.instances.settings.invertArrows) {
                this.invertArrowDirection();
            }
            if (this.instances.settings.flatArrows) {
                this.createFlatArrow();
            }
        }
    }

    protected override initGraphicsWrapper(): void {
        super.initGraphicsWrapper();
        this.changeCoreLinkThickness();
    }

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
        if (this.instances.settings.enableFeatures[this.instances.type]['curvedLinks']) {
            this.graphicsWrapper = new CurveLinkGraphicsWrapper(this);
        }
        else {
            this.graphicsWrapper = new LineLinkGraphicsWrapper(this);
        }
        this.graphicsWrapper.initGraphics();
    }

    // ================================= UNLOAD ================================

    override unload(): void {
        this.restoreCoreLinkThickness();
        this.resetArrowDirection();
        this.resetArrowShape();
        super.unload();
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

    // ================================ ARROWS =================================

    private invertArrowDirection(): void {
        const link = this.coreElement;
        if (link.arrow) {
            PluginInstances.proxysManager.registerProxy<typeof link.arrow>(
                this.coreElement,
                "arrow",
                {
                    set(target, prop, value, receiver) {
                        if (prop === "x" || prop === "y") {
                            var c2c_x = link.target.x - link.source.x
                                , c2c_y = link.target.y - link.source.y
                                , diag = Math.sqrt(c2c_x * c2c_x + c2c_y * c2c_y)
                                , source_r = link.source.getSize() * link.renderer.nodeScale
                                , target_r = link.target.getSize() * link.renderer.nodeScale;

                            if (prop === "x") {
                                target.x = link.source.x + c2c_x * source_r / diag;
                            }
                            else {
                                target.y = link.source.y + c2c_y * source_r / diag;
                            }
                        }
                        else if (prop === "rotation") {
                            target.rotation = value + Math.PI;
                        }
                        else {
                            // @ts-ignore
                            target[prop] = value;
                        }
                        return true;
                    }
                }
            );
        }
    }

    private resetArrowDirection(): void {
        PluginInstances.proxysManager.unregisterProxy(this.coreElement.arrow);
    }

    private createFlatArrow(): void {
        const arrow = this.coreElement.arrow;
        if (!arrow) return;
        arrow.clear();
        arrow.beginFill(16777215);
        arrow.moveTo(0, 0);
        arrow.lineTo(-4, -2);
        arrow.lineTo(-4, 2);
        arrow.lineTo(0, 0);
        arrow.endFill();
        this.hasChangedArrowShape = true;
    }

    private resetArrowShape(): void {
        if (!this.hasChangedArrowShape) return;
        const arrow = this.coreElement.arrow;
        if (!arrow) return;
        arrow.clear();
        arrow.beginFill(16777215);
        arrow.moveTo(0, 0);
        arrow.lineTo(-4, -2);
        arrow.lineTo(-3, 0);
        arrow.lineTo(-4, 2);
        arrow.lineTo(0, 0);
        arrow.endFill();
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

export function getLinkID(link: { source: { id: string }, target: { id: string } }): string {
    return link.source.id + "--to--" + link.target.id;
}