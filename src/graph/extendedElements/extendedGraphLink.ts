import { GraphLink } from "obsidian-typings";
import { InteractiveManager } from "../interactiveManager";
import { ExtendedGraphElement } from "../abstractAndInterfaces/extendedGraphElement";
import { LineLinkGraphicsWrapper } from "../graphicElements/lines/lineLinkGraphicsWrapper";
import { LinkGraphicsWrapper } from "src/graph/abstractAndInterfaces/linkGraphicsWrapper";
import { LINK_KEY } from "src/globalVariables";



export class ExtendedGraphLink extends ExtendedGraphElement<GraphLink> {
    name: string;
    graphicsWrapper?: LinkGraphicsWrapper;

    // ============================== CONSTRUCTOR ==============================

    constructor(link: GraphLink, types: Set<string>, manager: InteractiveManager) {
        const typesMap = new Map<string, Set<string>>();
        typesMap.set(LINK_KEY, types);
        super(link, typesMap, [manager]);
    }

    protected needGraphicsWrapper(): boolean {
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
        this.graphicsWrapper = new LineLinkGraphicsWrapper(this);
        this.graphicsWrapper.initGraphics();
        this.graphicsWrapper.updateGraphics();
        this.graphicsWrapper.connect();
    }

    // ============================== CORE ELEMENT =============================

    protected override isCoreElementUptodate(): boolean {
        return !!this.coreElement.line;
    }

    override isSameCoreElement(link: GraphLink): boolean {
        return link.source.id === this.coreElement.source.id && link.target.id === this.coreElement.target.id;
    }

    protected override getCoreCollection(): GraphLink[] {
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