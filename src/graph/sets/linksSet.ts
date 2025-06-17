import { TFile } from "obsidian";
import { GraphLink } from "obsidian-typings";
import { AbstractSet, ExtendedGraphLink, getBackgroundColor, getFile, getLinkID, getOutlinkTypes, GraphInstances, InteractiveManager } from "src/internal";

export class LinksSet extends AbstractSet<GraphLink> {
    extendedElementsMap: Map<string, ExtendedGraphLink>;

    // ============================== CONSTRUCTOR ==============================

    constructor(instances: GraphInstances, managers: InteractiveManager[]) {
        super(instances, managers);

        this.coreCollection = this.instances.renderer.links;
    }

    // =========================== EXTENDED ELEMENTS ===========================

    protected override createExtendedElement(link: GraphLink): ExtendedGraphLink {
        const id = getLinkID(link);

        const types = new Map<string, Set<string>>();
        for (const [key, manager] of this.managers) {
            types.set(key, this.getTypes(key, link));
        }

        const extendedGraphLink = new ExtendedGraphLink(
            this.instances,
            link,
            types,
            [...this.managers.values()]
        );

        this.extendedElementsMap.set(id, extendedGraphLink);
        this.connectedIDs.add(id);

        return extendedGraphLink;
    }

    // ================================ GETTERS ================================

    protected override getID(element: GraphLink): string {
        return getLinkID(element);
    }

    protected override getTypesFromFile(key: string, link: GraphLink, file: TFile): Set<string> {
        const outlinkTypes = getOutlinkTypes(this.instances.settings, file);
        return outlinkTypes.get(link.target.id) ?? new Set<string>();
    }

    protected getAbstractFile(link: GraphLink): TFile | null {
        return getFile(link.source.id);
    }


    // ================================== CSS ==================================

    onCSSChange(): void {
        const color = getBackgroundColor(this.instances.renderer);
        this.extendedElementsMap.forEach(extendedLink => {
            extendedLink.text?.computeCSSStyle();
            extendedLink.text?.applyCSSChanges();
        });
    }

}