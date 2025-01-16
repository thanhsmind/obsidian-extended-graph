
import { Component } from 'obsidian';
import { InteractiveManager } from './interactiveManager';
import { GraphView } from 'src/views/view';
import { NodesSet } from './nodesSet';
import { LinksSet } from './linksSet';
import { DEFAULT_VIEW_ID, DisconnectionCause, LINK_KEY, TAG_KEY } from 'src/globalVariables';
import { GraphEventsDispatcher } from './graphEventsDispatcher';
import { ExtendedGraphSettings } from 'src/settings/settings';
import { getLinkID } from './elements/link';
import { getEngine } from 'src/helperFunctions';
import { logToFile } from 'src/logs';
import { GraphEngine, GraphRenderer } from 'obsidian-typings';

export class Graph extends Component {
    // Parent dispatcher
    readonly dispatcher: GraphEventsDispatcher;

    // Elements
    readonly engine: GraphEngine;
    readonly renderer: GraphRenderer;
    readonly dynamicSettings: ExtendedGraphSettings;
    readonly staticSettings: ExtendedGraphSettings;

    // Interactive managers
    interactiveManagers = new Map<string, InteractiveManager>();

    // Sets
    nodesSet: NodesSet;
    linksSet: LinksSet;

    // Disconnection chains
    nodesDisconnectionCascade = new Map<string, {isDiconnected: boolean, links: Set<string>, nodes: Set<string>}>();
    linksDisconnectionCascade = new Map<string, {isDiconnected: boolean, links: Set<string>, nodes: Set<string>}>();
    
    // Functions to override
    onOptionsChangeOriginal: () => void;
    searchGetValueOriginal: () => string;

    // ============================== CONSTRUCTOR ==============================

    constructor(dispatcher: GraphEventsDispatcher) {
        super();

        // Parent dispatcher
        this.dispatcher = dispatcher;

        // Elements
        this.engine          = getEngine(this.dispatcher.leaf);
        this.renderer        = dispatcher.leaf.view.renderer;
        this.dynamicSettings = dispatcher.graphsManager.plugin.settings;
        this.staticSettings  = structuredClone(this.dynamicSettings);

        // Interactive managers
        this.initializeInteractiveManagers();

        // Sets
        this.nodesSet = new NodesSet(this, this.getNodeManagers());
        this.linksSet = new LinksSet(this, this.interactiveManagers.get(LINK_KEY));

        // Functions to override
        this.overrideSearchGetValue();
        this.overrideOnOptionsChange();
    }

    private initializeInteractiveManagers(): void {
        const keys = this.getInteractiveManagerKeys();
        for (const key of keys) {
            const manager = new InteractiveManager(this.dispatcher, this.dynamicSettings, key);
            this.interactiveManagers.set(key, manager);
            this.addChild(manager);
        }
    }

    private getInteractiveManagerKeys(): string[] {
        const keys: string[] = [];
        if (this.staticSettings.enableProperties) {
            for (const property in this.staticSettings.additionalProperties) {
                if (this.staticSettings.additionalProperties[property]) keys.push(property);
            }
        }
        if (this.staticSettings.enableTags)  keys.push(TAG_KEY);
        if (this.staticSettings.enableLinks) keys.push(LINK_KEY);
        return keys;
    }

    private getNodeManagers(): InteractiveManager[] {
        return Array.from(this.interactiveManagers.values()).filter(manager => manager.name !== LINK_KEY);
    }

    private overrideSearchGetValue(): void {
        this.searchGetValueOriginal = this.engine.filterOptions.search.getValue;
        this.engine.filterOptions.search.getValue = (() => {
            const prepend = this.dynamicSettings.globalFilter + " ";
            return prepend + this.engine.filterOptions.search.inputEl.value;
        }).bind(this);
    }

    private overrideOnOptionsChange(): void {
        this.onOptionsChangeOriginal = this.dispatcher.leaf.view.onOptionsChange;
        this.dispatcher.leaf.view.onOptionsChange = () => {};
    }

    // ================================ LOADING ================================

    onload(): void {
        this.initSets().then(() => {
            this.dispatcher.onGraphReady();
        }).catch(e => {
            console.error(e);
        });
    }

    private async initSets(): Promise<void> {
        // Let time to the engine to apply user filters
        await this.delay(500);

        this.nodesSet.load();
        this.linksSet.load();
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // =============================== UNLOADING ===============================

    onunload(): void {
        this.restoreOriginalFunctions();
        this.enableDisconnectedNodes();
        this.enableDisconnectedLinks();
        this.updateWorker();
    }

    private restoreOriginalFunctions(): void {
        this.engine.filterOptions.search.getValue = this.searchGetValueOriginal;
        this.dispatcher.leaf.view.onOptionsChange = this.onOptionsChangeOriginal;
    }

    private enableDisconnectedNodes(): void {
        for (const cause of Object.values(DisconnectionCause)) {
            this.nodesSet.enableNodes([...this.nodesSet.disconnectedNodes[cause]], cause);
        }
    }

    private enableDisconnectedLinks(): void {
        for (const cause of Object.values(DisconnectionCause)) {
            this.linksSet.enableLinks(this.linksSet.disconnectedLinks[cause], cause);
        }
    }

    // ============================= UPDATING LINKS ============================

    /**
     * Disables link types specified in the types array.
     * @param types - Array of link types to disable.
     * @returns boolean - True if links were found and disabled, otherwise false.
     */
    disableLinkTypes(types: string[]): boolean {
        const links = this.linksSet.getLinks(types);
        if (links) {
            this.disableLinks(links);
            return true;
        }
        return false;
    }

    /**
     * Enables link types specified in the types array.
     * @param types - Array of link types to enable.
     * @returns boolean - True if links were found and enabled, otherwise false.
    */
    enableLinkTypes(types: string[]): boolean {
        const links = this.linksSet.getLinks(types);
        if (links) {
            this.enableLinks(links);
            return true;
        }
        return false;
    }

    /**
     * Disables links specified by their IDs.
     * @param ids - Set of link IDs to disable.
     */
    private disableLinks(ids: Set<string>): boolean {
        const disabledLinks = this.linksSet.disableLinks(ids, DisconnectionCause.USER);

        if (this.staticSettings.removeSource || this.staticSettings.removeTarget) {
            for (const linkID of ids) {
                const cascade = this.linksDisconnectionCascade.get(linkID) || {isDiconnected: true, links: new Set<string>(), nodes: new Set<string>()};

                // Disable nodes by cascading
                const cascadeDisabledNodes = this.getNodesByCascadingLink(linkID);
                cascade.nodes = new Set([...cascade.nodes, ...cascadeDisabledNodes]);
                if (disabledLinks.has(linkID)) this.nodesSet.disableNodes([...cascadeDisabledNodes], DisconnectionCause.USER);
                
                // Disable links by cascading
                for (const nodeID of cascadeDisabledNodes) {
                    const cascadeDisabledLinks = this.getLinksByCascadingNode(nodeID, [...ids]);
                    cascade.links = new Set([...cascade.links, ...cascadeDisabledLinks]);
                    if (disabledLinks.has(linkID)) this.linksSet.disableLinks(cascadeDisabledLinks, DisconnectionCause.USER);
                }

                if (!this.linksDisconnectionCascade.has(linkID)) this.linksDisconnectionCascade.set(linkID, cascade);
            }
        }

        if (disabledLinks.size > 0) this.disableOrphans();

        return disabledLinks.size > 0;
    }

    private getNodesByCascadingLink(linkID: string, invalidNodeIDs: readonly string[] = []) : Set<string> {
        const nodesToDisable = new Set<string>();
        const link = this.linksSet.linksMap.get(linkID)?.link;
        if (!link) return nodesToDisable;

        if (this.staticSettings.removeSource && !invalidNodeIDs.includes(link.source.id)) {
            nodesToDisable.add(link.source.id);
        }
        if (this.staticSettings.removeTarget && !invalidNodeIDs.includes(link.target.id)) {
            nodesToDisable.add(link.target.id);
        }
        return nodesToDisable;
    }

    private getLinksByCascadingNode(nodeID: string, invalidLinkIDs: readonly string[] = []) : Set<string> {
        const linksToDisable = new Set<string>();
        const node = this.nodesSet.nodesMap.get(nodeID)?.node;
        if (!node) return new Set<string>();

        for (const forward in node.forward) {
            const linkID = getLinkID({source: {id: nodeID}, target: {id: forward}});
            if (!invalidLinkIDs.includes(linkID)) linksToDisable.add(linkID);
        }
        for (const reverse in node.reverse) {
            const linkID = getLinkID({source: {id: reverse}, target: {id: nodeID}});
            if (!invalidLinkIDs.includes(linkID)) linksToDisable.add(linkID);
        }
        return linksToDisable;
    }

    /**
     * Enables links specified by their IDs.
     * @param ids - Set of link IDs to enable.
     */
    private enableLinks(ids: Set<string>): boolean {
        const cascades = this.getAndCleanCascadeLinks(ids);

        // Get remaining disabled nodes and links from other active cascades
        let nodesToKeepDisabled: string[] = [];
        for (const [id, cascade] of this.nodesDisconnectionCascade) {
            if (cascade.isDiconnected) nodesToKeepDisabled.push(id);
            nodesToKeepDisabled = nodesToKeepDisabled.concat([...cascade.nodes]);
        }
        let linksToKeepDisabled: string[] = [];
        for (const [id, cascade] of this.linksDisconnectionCascade) {
            if (cascade.isDiconnected) linksToKeepDisabled.push(id);
            linksToKeepDisabled = linksToKeepDisabled.concat([...cascade.links]);
        }

        // Enable links directly
        const linksToEnable = new Set<string>([...ids.values()].filter(id => !linksToKeepDisabled.includes(id)));
        this.linksSet.enableLinks(linksToEnable, DisconnectionCause.USER);

        for (const linkID of linksToEnable) {
            // Cascade
            this.enableCascadeChainFromLink(linkID, cascades, nodesToKeepDisabled, linksToKeepDisabled);
        }

        if (linksToEnable.size > 0) this.enableOrphans();

        return linksToEnable.size > 0;
    }

    private getAndCleanCascadeLinks(linkIDs: Set<string>): Map<string, {links: Set<string>, nodes: Set<string>}> {
        const cascades = new Map<string, {links: Set<string>, nodes: Set<string>}>();
        for (const linkID of linkIDs) {
            const cascade = structuredClone(this.linksDisconnectionCascade.get(linkID)) || {links: new Set<string>(), nodes: new Set<string>()};
            this.linksDisconnectionCascade.set(linkID, {isDiconnected: false, links: new Set<string>(), nodes: new Set<string>()});
            cascades.set(linkID, cascade);
        }
        return cascades;
    }

    private enableCascadeChainFromLink(linkID: string, cascades: Map<string, {links: Set<string>, nodes: Set<string>}>, nodesToKeepDisabled: string[] = [], linksToKeepDisabled: string[] = []) : void {
        const cascade = cascades.get(linkID);
        if (!cascade) return;

        // Enable nodes by cascading
        const nodesToEnable = [...cascade.nodes].filter(id => !nodesToKeepDisabled.includes(id));
        this.nodesSet.enableNodes(nodesToEnable, DisconnectionCause.USER);

        // Enable links by cascading
        const linksToEnable = [...cascade.links].filter(id => !linksToKeepDisabled.includes(id));
        this.linksSet.enableLinks(new Set<string>(linksToEnable), DisconnectionCause.USER);
    }

    // ============================ UPDATING NODES =============================

    disableNodeInteractiveTypes(key: string, types: string[]): boolean {
        let nodesToDisable: string[] = [];
        for (const type of types) {
            nodesToDisable = nodesToDisable.concat(this.nodesSet.disableInteractive(key, type));
        }
        if (!this.staticSettings.fadeOnDisable && nodesToDisable.length > 0) {
            return this.disableNodes(nodesToDisable);
        }
        return false;
    }

    enableNodeInteractiveTypes(key: string, types: string[]): boolean {
        let nodesToEnable: string[] = [];
        for (const type of types) {
            nodesToEnable = nodesToEnable.concat(this.nodesSet.enableInteractive(key, type));
        }
        if (!this.staticSettings.fadeOnDisable && nodesToEnable.length > 0) {
            return this.enableNodes(nodesToEnable);
        }
        return false;
    }

    /**
     * Disables nodes specified by their IDs and cascades the disconnection to related links.
     * @param ids - Array of node IDs to disable.
     */
    disableNodes(ids: string[]): boolean {
        // Disable nodes directly
        const disabledNodes = this.nodesSet.disableNodes(ids, DisconnectionCause.USER);

        for (const nodeID of ids) {
            const cascade = this.nodesDisconnectionCascade.get(nodeID) || {isDiconnected: true, links: new Set<string>(), nodes: new Set<string>()};

            // Disable links by cascading
            const cascadeDisabledLinks = this.getLinksByCascadingNode(nodeID);
            cascade.links = new Set([...cascade.links, ...cascadeDisabledLinks]);
            if (disabledNodes.has(nodeID)) this.linksSet.disableLinks(cascadeDisabledLinks, DisconnectionCause.USER);

            /*// Disable nodes by cascading
            for (const linkID of cascadeDisabledLinks) {
                const cascadeDisabledNodes = this.getNodesByCascadingLink(linkID, [...ids]);
                cascade.nodes = new Set([...cascade.nodes, ...cascadeDisabledNodes]);
                if (disabledNodes.has(nodeID)) this.nodesSet.disableNodes([...cascadeDisabledNodes], DisconnectionCause.NODE_CASCADE);
            }*/

            if (!this.nodesDisconnectionCascade.has(nodeID)) this.nodesDisconnectionCascade.set(nodeID, cascade);
        }

        if (disabledNodes.size > 0) this.disableOrphans();

        return disabledNodes.size > 0;
    }

    /**
     * Enables nodes specified by their IDs and cascades the reconnection to related links.
     * @param ids - Array of node IDs to enable.
     */
    enableNodes(ids: string[]): boolean {
        // Get all the cascade chains and clean them in the map structure
        const cascades = this.getAndCleanCascadeNodes(new Set<string>(ids));

        // Get remaining disabled nodes and links from other active cascades
        let nodesToKeepDisabled: string[] = [];
        for (const [id, cascade] of this.nodesDisconnectionCascade) {
            if (cascade.isDiconnected) nodesToKeepDisabled.push(id);
            nodesToKeepDisabled = nodesToKeepDisabled.concat([...cascade.nodes]);
        }
        let nodesToEnable = new Set<string>([...ids.values()].filter(id =>
            !nodesToKeepDisabled.includes(id)
        ));

        // Enable nodes directly
        this.nodesSet.enableNodes([...nodesToEnable], DisconnectionCause.USER);

        let linksToKeepDisabled: string[] = [];
        for (const [id, cascade] of this.linksDisconnectionCascade) {
            if (cascade.isDiconnected) linksToKeepDisabled.push(id);
            linksToKeepDisabled = linksToKeepDisabled.concat([...cascade.links]);
        }
        for (const nodeID of nodesToEnable) {
            this.enableCascadeChainFromNode(nodeID, cascades, nodesToKeepDisabled, linksToKeepDisabled);
        }

        if (nodesToEnable.size > 0) {
            this.disableOrphans();
            this.enableOrphans();
        }

        return nodesToEnable.size > 0;
    }

    private getAndCleanCascadeNodes(nodeIDs: Set<string>): Map<string, {links: Set<string>, nodes: Set<string>}> {
        const cascades = new Map<string, {links: Set<string>, nodes: Set<string>}>();
        for (const nodeID of nodeIDs) {
            const cascade = structuredClone(this.nodesDisconnectionCascade.get(nodeID)) || {links: new Set<string>(), nodes: new Set<string>()};
            this.nodesDisconnectionCascade.set(nodeID, {isDiconnected: false, links: new Set<string>(), nodes: new Set<string>()});
            cascades.set(nodeID, cascade);
        }
        return cascades;
    }

    private enableCascadeChainFromNode(nodeID: string, cascades: Map<string, {links: Set<string>, nodes: Set<string>}>, nodesToKeepDisabled: string[] = [], linksToKeepDisabled: string[] = []) : void {
        const cascade = cascades.get(nodeID);
        if (!cascade) return;

        // Enable links by cascading
        const linksToEnable = [...cascade.links].filter(id => !linksToKeepDisabled.includes(id));
        this.linksSet.enableLinks(new Set<string>(linksToEnable), DisconnectionCause.USER);

        // Enable nodes by cascading
        const nodesToEnable = [...cascade.nodes].filter(id => !nodesToKeepDisabled.includes(id));
        this.nodesSet.enableNodes(nodesToEnable, DisconnectionCause.USER);
    }

    disableOrphans() : boolean {
        if (this.engine.options.showOrphans) return false;
        const newOrphans = [...this.nodesSet.connectedNodes].filter(id =>
            this.nodesSet.nodesMap.get(id)?.node.renderer && this.nodeIsOrphan(id)
        );
        if (newOrphans.length === 0) return false;
        const nodesDisabled = this.nodesSet.disableNodes(newOrphans, DisconnectionCause.ORPHAN);
        return nodesDisabled.size > 0;
    }

    enableOrphans() : boolean {
        const oldOrphans = this.nodesSet.disconnectedNodes[DisconnectionCause.ORPHAN];
        if (oldOrphans.size === 0) return false;

        // Show all orphans
        if (this.engine.options.showOrphans) {
            this.nodesSet.enableNodes([...oldOrphans], DisconnectionCause.ORPHAN);
        }
        // Show nodes that are not orphans anymore
        else {
            const nonOrphans = [...oldOrphans].filter(id => !this.nodeIsOrphan(id));
            if (nonOrphans.length === 0) return false;
            
            this.nodesSet.enableNodes(nonOrphans, DisconnectionCause.ORPHAN);
        }
        return true;
    }
    
    private nodeIsOrphan(id: string) : boolean {
        for (const linkID of this.linksSet.connectedLinks) {
            const link = this.linksSet.linksMap.get(linkID)?.link;
            if (!link) continue;
            if (link.source.id === id || link.target.id === id) return false;
        }
        return true;
    }
    
    // ============================ UPDATING WORKER ============================

    /**
     * Updates the worker with the current state of nodes and links.
     */
    updateWorker(): void {
        const nodes = this.getNodesForWorker();
        const links = this.getLinksForWorker();

        this.renderer.worker.postMessage({
            nodes: nodes,
            links: links,
            alpha: 0.3,
            run: true
        });
    }

    private getNodesForWorker(): { [node: string]: number[] } {
        const nodes: { [node: string]: number[] } = {};
        for (const id of this.nodesSet.connectedNodes) {
            const wrapper = this.nodesSet.nodesMap.get(id);
            if (wrapper) nodes[id] = [wrapper.node.x, wrapper.node.y];
        }
        return nodes;
    }

    private getLinksForWorker(): string[][] {
        const links: string[][] = [];
        for (const id of this.linksSet.connectedLinks) {
            const l = this.linksSet.linksMap.get(id);
            if (l) links.push([l.link.source.id, l.link.target.id]);
        }
        return links;
    }

    // ================================= VIEWS =================================

    /**
     * Creates a new view with the specified name from the current graph.
     * @param name - The name of the new view.
     * @returns string - The ID of the new view.
     */
    newView(name: string): string {
        const view = new GraphView(name);
        view.setID();
        view.saveGraph(this);
        this.dispatcher.graphsManager.onViewNeedsSaving(view.data);
        return view.data.id;
    }

    /**
     * Saves the current graph in the view with the specified ID.
     * @param id - The ID of the view to save.
     */
    saveView(id: string): void {
        if (id === DEFAULT_VIEW_ID) return;
        const viewData = this.staticSettings.views.find(v => v.id == id);
        if (!viewData) return;
        const view = new GraphView(viewData?.name);
        view.setID(id);
        view.saveGraph(this);
        this.dispatcher.graphsManager.onViewNeedsSaving(view.data);
    }
}
