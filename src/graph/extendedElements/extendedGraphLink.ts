import { GraphLink } from "obsidian-typings";
import { InteractiveManager } from "../interactiveManager";
import { LineLinkGraphicsWrapper } from "../graphicElements/links/lineLinkGraphicsWrapper";
import { LinkGraphics } from "../graphicElements/links/linkGraphics";
import { CurveLinkGraphicsWrapper } from "../graphicElements/links/curveLinkGraphicsWrapper";
import { ExtendedGraphSettings } from "src/settings/settings";
import { ExtendedGraphElement } from "./extendedGraphElement";
import { LinkGraphicsWrapper } from "../graphicElements/links/linkGraphicsWrapper";

export class ExtendedGraphLink extends ExtendedGraphElement<GraphLink> {
    name: string;
    graphicsWrapper?: LinkGraphicsWrapper<LinkGraphics>;

    // ============================== CONSTRUCTOR ==============================

    constructor(link: GraphLink, types: Map<string, Set<string>>, managers: InteractiveManager[], settings: ExtendedGraphSettings) {
        super(link, types, managers, settings);
        this.initGraphicsWrapper();
    }

    protected needGraphicsWrapper(): boolean {
        if (this.settings.enableFeatures['links'] && this.settings.enableFeatures['curvedLinks']) {
            return true;
        }
        for (const [key, manager] of this.managers) {
            const types = this.types.get(key);
            if (!types || types.size === 0) continue;
            if (!types.has(manager.settings.interactiveSettings[key].noneType)) {
                return true;
            }
        }
        return false;
    }

    protected createGraphicsWrapper(): void {
        if (this.settings.enableFeatures['curvedLinks']) {
            this.graphicsWrapper = new CurveLinkGraphicsWrapper(this);
        }
        else {
            this.graphicsWrapper = new LineLinkGraphicsWrapper(this);
        }
        this.graphicsWrapper.initGraphics();

        let layer = 1;
        for (const [key, manager] of this.managers) {
            const validTypes = this.getTypes(key);
            this.graphicsWrapper.createManagerGraphics(manager, validTypes, layer);
            layer++;
        }
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

    // ================================ GETTERS ================================

    getID(): string {
        return getLinkID(this.coreElement);
    }
}

export function getLinkID(link: {source: {id: string}, target: {id: string}}): string {
    return link.source.id + "--to--" + link.target.id;
}