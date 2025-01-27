import { TFile } from "obsidian";
import { GraphLink } from "obsidian-typings";
import { DataviewApi, getAPI as getDataviewAPI } from "obsidian-dataview";
import { AbstractSet, DisconnectionCause, ExtendedGraphLink, getFile, getLinkID, Graph, InteractiveManager, INVALID_KEYS, LINK_KEY } from "src/internal";

export class LinksSet extends AbstractSet<GraphLink> {
    extendedElementsMap: Map<string, ExtendedGraphLink>;

    // ============================== CONSTRUCTOR ==============================

    constructor(graph: Graph, managers: InteractiveManager[]) {
        super(graph, managers);

        this.coreCollection = this.graph.renderer.links;
    }

    // =========================== EXTENDED ELEMENTS ===========================

    protected override createExtendedElement(link: GraphLink) {
        const id = getLinkID(link);

        const types = new Map<string, Set<string>>();
        for (const [key, manager] of this.managers) {
            types.set(key, this.getTypes(key, link));
        }

        const extendedGraphLink = new ExtendedGraphLink(
            link,
            types,
            [...this.managers.values()],
            this.graph.staticSettings
        );

        this.extendedElementsMap.set(id, extendedGraphLink);
        this.connectedIDs.add(id);
    }

    // ================================ GETTERS ================================

    protected override getID(element: GraphLink): string {
        return getLinkID(element);
    }

    protected override getTypesFromFile(key: string, element: GraphLink, file: TFile): Set<string> {
        const dv = getDataviewAPI(this.graph.dispatcher.graphsManager.plugin.app);
        return dv ? this.getLinkTypesWithDataview(dv, element) : this.getLinkTypesWithFrontmatter(element, file);
    }

    private getLinkTypesWithDataview(dv: DataviewApi, link: GraphLink): Set<string> {
        const linkTypes = new Set<string>();
        const sourcePage = dv.page(link.source.id);
        for (const [key, value] of Object.entries(sourcePage)) {
            if (key === "file" || key === this.graph.staticSettings.imageProperty) continue;
            if (value === null || value === undefined || value === '') continue;

            if ((typeof value === "object") && ("path" in value) && ((value as any).path === link.target.id)) {
                linkTypes.add(key);
            }
            else if (Array.isArray(value)) {
                for (const l of value) {
                    if ((typeof l === "object") && ("path" in l) && ((l as any).path === link.target.id)) {
                        linkTypes.add(key);
                    }
                }
            }
        }
        return linkTypes;
    }

    private getLinkTypesWithFrontmatter(link: GraphLink, file: TFile): Set<string> {
        const linkTypes = new Set<string>();
        const frontmatterLinks = this.graph.dispatcher.graphsManager.plugin.app.metadataCache.getFileCache(file)?.frontmatterLinks;
        if (frontmatterLinks) {
            // For each link in the frontmatters, check if target matches
            for (const linkCache of frontmatterLinks) {
                const linkType = linkCache.key.split('.')[0];
                const targetID = this.graph.dispatcher.graphsManager.plugin.app.metadataCache.getFirstLinkpathDest(linkCache.link, ".")?.path;
                if (targetID === link.target.id) {
                    linkTypes.add(linkType);
                }
            }
        }
        return linkTypes;
    }

    protected override isTypeValid(type: string): boolean {
        if (this.graph.staticSettings.interactiveSettings[LINK_KEY].unselected.includes(type)) return false;
        if (INVALID_KEYS[LINK_KEY].includes(type)) return false;
        return true;
    }

    protected getAbstractFile(link: GraphLink): TFile | null {
        return getFile(this.graph.dispatcher.graphsManager.plugin.app, link.source.id);
    }

    // ============================ TOGGLE ELEMENTS ============================

    /**
     * Connects all link wrappers in the set to their Obsidian link
     */
    connectLinks(): void {
        for (const [id, extendedLink] of this.extendedElementsMap) {
            extendedLink.updateCoreElement();
        }
    }

    // ================================= DEBUG =================================

    printDisconnectedLinks() {
        const pad = (str: string, length: number, char = ' ') =>
            str.padStart((str.length + length) / 2, char).padEnd(length, char);

        const rows: string[] = [];
        const maxIDLength = Math.max(...[...this.extendedElementsMap.keys()].map(id => id.length));

        let hrLength = maxIDLength + 2;
        hrLength += 12;
        hrLength += Object.values(DisconnectionCause).map(c => c.length + 3).reduce((s: number, a: number) => s + a, 0);

        const hr = "+" + "-".repeat(hrLength) + "+";

        for (const id of this.extendedElementsMap.keys()) {
            let row = "| " + id.padEnd(maxIDLength) + " | ";
            row += pad(this.connectedIDs.has(id) ? "X" : " ", 9) + " | ";
            for (const cause of Object.values(DisconnectionCause)) {
                let cell = this.disconnectedIDs[cause].has(id) ? "X" : " ";
                cell = pad(cell, cause.length);
                row += cell + " | ";
            }
            rows.push(row);
        }

        let header = "| " + "ID".padEnd(maxIDLength) + " | ";
        header += "connected | ";
        for (const cause of Object.values(DisconnectionCause)) {
            header += pad(cause, cause.length) + " | ";
        }

        let table = hr + "\n" + header + "\n" + hr + "\n" + rows.join("\n") + "\n" + hr;

        console.log(table);
    }

}