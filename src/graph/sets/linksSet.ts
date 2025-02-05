import { TFile } from "obsidian";
import { GraphLink } from "obsidian-typings";
import { DataviewApi, getAPI as getDataviewAPI } from "obsidian-dataview";
import { AbstractSet, DisconnectionCause, ExtendedGraphLink, getFile, getLinkID, getOutlinkTypes, Graph, GraphInstances, InteractiveManager, INVALID_KEYS, LINK_KEY, PluginInstances } from "src/internal";

export class LinksSet extends AbstractSet<GraphLink> {
    extendedElementsMap: Map<string, ExtendedGraphLink>;

    // ============================== CONSTRUCTOR ==============================

    constructor(instances: GraphInstances, managers: InteractiveManager[]) {
        super(instances, managers);

        this.coreCollection = this.instances.renderer.links;
    }

    // =========================== EXTENDED ELEMENTS ===========================

    protected override createExtendedElement(link: GraphLink) {
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
    }

    override loadCascadesForMissingElements(ids: Set<string>): void {
        for (const id of ids) {
            const extendedGraphLink = this.extendedElementsMap.get(id);
            if (!extendedGraphLink) continue;
            if (extendedGraphLink.isAnyManagerDisabled()) {
                this.instances.graph.disableLinks(new Set([extendedGraphLink.id]));
            }
            if (this.instances.graph.addLinkInCascadesAfterCreation(extendedGraphLink.id) && !extendedGraphLink.isActive) {
                this.disableElements([extendedGraphLink.id], DisconnectionCause.USER);
            }
        }
    }

    protected override clearExtendedElement(el: ExtendedGraphLink): void {
        super.clearExtendedElement(el);
        el.restoreCoreLinkThickness();
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