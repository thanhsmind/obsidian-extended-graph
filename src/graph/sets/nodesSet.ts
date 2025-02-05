import { TFile } from "obsidian";
import { Assets, Texture } from "pixi.js";
import { GraphNode } from "obsidian-typings";
import { AbstractSet, DisconnectionCause, ExtendedGraphFileNode, ExtendedGraphNode, FileNodeGraphicsWrapper, getBackgroundColor, getFile, getFileInteractives, getImageUri, Graph, GraphInstances, InteractiveManager, INVALID_KEYS, PluginInstances, TAG_KEY, TagNodeGraphicsWrapper } from "src/internal";
import { ExtendedGraphTagNode } from "../extendedElements/extendedGraphTagNode";

export class NodesSet extends AbstractSet<GraphNode> {
    extendedElementsMap: Map<string, ExtendedGraphNode>;
    lastDraggedPinnedNode: string | null;

    // ============================== CONSTRUCTOR ==============================

    constructor(instances: GraphInstances, managers: InteractiveManager[]) {
        super(instances, managers);

        this.coreCollection = this.instances.renderer.nodes;
    }

    // ================================ LOADING ================================

    protected override handleMissingElements(ids: Set<string>): void {
        this.loadAssets(ids);
    }

    // =============================== UNLOADING ===============================

    override unload() {
        for (const node of this.extendedElementsMap.values()) {
            node.unload();
        }
        super.unload();
    }

    // ================================ IMAGES =================================
    
    private loadAssets(ids: Set<string>): void {
        const { imageURIs, emptyTextures } = this.getImageURIsAndEmptyTextures(ids);
        this.initNodesGraphics(imageURIs, emptyTextures);
    }

    private getImageURIsAndEmptyTextures(ids: Set<string>): { imageURIs: Map<string, string>, emptyTextures: string[] } {
        const imageURIs = new Map<string, string>();
        const emptyTextures: string[] = [];
        for (const id of ids) {
            const imageUri = getImageUri(this.instances.settings.imageProperty, id);
            if (imageUri && this.instances.settings.enableFeatures[this.instances.type]['images']) {
                imageURIs.set(id, imageUri);
            } else {
                emptyTextures.push(id);
            }
        }
        return { imageURIs, emptyTextures };
    }

    private initNodesGraphics(imageURIs: Map<string, string>, emptyTextures: string[]) {
        const backgroundColor = getBackgroundColor(this.instances.renderer);
        Assets.load([...imageURIs.values()]).then((textures: Record<string, Texture>) => {
            for (const [id, uri] of imageURIs) {
                this.initNodeGraphics(id, textures[uri], backgroundColor);
            }
        });
        for (const id of emptyTextures) {
            this.initNodeGraphics(id, undefined, backgroundColor);
        }
    }

    private initNodeGraphics(id: string, texture: Texture | undefined, backgroundColor: Uint8Array): void {
        const extendedNode = this.extendedElementsMap.get(id);
        if (!extendedNode || !extendedNode.graphicsWrapper) return;
        try {
            (extendedNode.graphicsWrapper as FileNodeGraphicsWrapper).initNodeImage(texture);
            extendedNode.graphicsWrapper.updateOpacityLayerColor(backgroundColor);
        }
        catch {

        }
    }

    // =========================== EXTENDED ELEMENTS ===========================

    protected override createExtendedElement(node: GraphNode): void {
        const id = node.id;

        const types = new Map<string, Set<string>>();
        for (const [key, manager] of this.managers) {
            types.set(key, this.getTypes(key, node));
        }

        let extendedGraphNode: ExtendedGraphNode;
        if (node.type === "tag") {
            extendedGraphNode = new ExtendedGraphTagNode(
                this.instances,
                node,
                types,
                [...this.managers.values()]
            );
        }
        else {
            extendedGraphNode = new ExtendedGraphFileNode(
                this.instances,
                node,
                types,
                [...this.managers.values()]
            );
        }

        this.extendedElementsMap.set(id, extendedGraphNode);
        this.connectedIDs.add(id);

    }

    override loadCascadesForMissingElements(ids: Set<string>): void {
        for (const id of ids) {
            const extendedGraphNode = this.extendedElementsMap.get(id);
            if (!extendedGraphNode) continue;
            if (extendedGraphNode.isAnyManagerDisabled()) {
                this.instances.graph.disableNodes([extendedGraphNode.id]);
            }
            if (this.instances.graph.addNodeInCascadesAfterCreation(extendedGraphNode.id) && !extendedGraphNode.isActive) {
                this.disableElements([extendedGraphNode.id], DisconnectionCause.USER);
            }
        }
    }

    // ================================ GETTERS ================================

    protected override getID(element: GraphNode): string {
        return element.id;
    }

    protected override getTypesFromFile(key: string, element: GraphNode, file: TFile): Set<string> {
        return getFileInteractives(key, file);
    }
    
    protected getAbstractFile(node: GraphNode): TFile | null {
        return getFile(node.id);
    }

    // ============================= INTERACTIVES ==============================
    
    /**
     * Reset arcs for each node
     */
    resetArcs(key: string): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['tags']) return;
        for (const [id, extendedElement] of this.extendedElementsMap) {
            try {
                const manager = this.managers.get(key);
                if (!manager) continue;
                (extendedElement.graphicsWrapper as FileNodeGraphicsWrapper).resetManagerGraphics(manager);
            }
            catch {
                
            }
        }
    }

    // ============================ TOGGLE ELEMENTS ============================

    /**
     * Connects all node wrappers in the set to their obsidian node.
     */
    connectNodes(): void {
        for (const [id, extendedNode] of this.extendedElementsMap) {
            extendedNode.updateCoreElement();
        }
    }

    // ================================== CSS ==================================
    
    /**
     * Update the background color. Called when the theme changes.
     */
    updateOpacityLayerColor(): void {
        const color = getBackgroundColor(this.instances.renderer);
        this.extendedElementsMap.forEach(extendedNode => {
            extendedNode.graphicsWrapper?.updateOpacityLayerColor(color);
        });
    }

    updateFontFamily(): void {
        this.extendedElementsMap.forEach(extendedNode => {
            extendedNode.updateFontFamily();
        });
    }

    // =============================== EMPHASIZE ===============================

    /**
     * Highlights or unhighlights a node based on the provided file.
     * @param file - The file corresponding to the node.
     * @param emphasize - Whether to highlight or unhighlight the node.
     */
    emphasizeNode(file: TFile, emphasize: boolean): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['focus']) return;

        const extendedNode = this.extendedElementsMap.get(file.path);
        if (!extendedNode || !extendedNode.graphicsWrapper) return;

        try {
            if (emphasize) {
                let color = this.instances.renderer.colors.fillFocused.rgb;
                (extendedNode.graphicsWrapper as FileNodeGraphicsWrapper).emphasize(true);
            } else {
                (extendedNode.graphicsWrapper as FileNodeGraphicsWrapper).emphasize(false);
            }
        }
        catch {

        }
    }

    // =============================== PIN NODES ===============================

    setPinnedNodes(ids: Record<string, {x: number, y: number}>) {
        for (const [id, extendedNode] of this.extendedElementsMap) {
            const isPinned = ids.hasOwnProperty(id);
            if (isPinned && !extendedNode.isPinned) {
                this.instances.nodesSet.pinNode(id, ids[id].x, ids[id].y);
            }
            else if (!isPinned && extendedNode.isPinned) {
                this.instances.nodesSet.unpinNode(id);
            }
        }
    }

    pinNode(id: string, x?: number, y?: number) {
        const extendedNode = this.extendedElementsMap.get(id);
        if (!extendedNode) return;
        const node = extendedNode.coreElement;
        if (x) node.x = x;
        if (y) node.y = y;
        node.fx = node.x;
        node.fy = node.y;
        this.instances.renderer.worker.postMessage({
            run: true,
            forceNode: {
                id: node.id,
                x: node.x,
                y: node.y
            }
        });
        extendedNode.pin();
    }

    unpinNode(id: string) {
        const extendedNode = this.extendedElementsMap.get(id);
        if (!extendedNode) return;
        const node = extendedNode.coreElement;
        node.fx = null;
        node.fy = null;
        this.instances.renderer.worker.postMessage({
            forceNode: {
                id: node.id,
                x: null,
                y: null
            }
        });
        extendedNode.unpin();
    }

    isNodePinned(id: string): boolean | undefined {
        const extendedNode = this.extendedElementsMap.get(id);
        if (!extendedNode) return;
        return extendedNode.isPinned;
    }

    setLastDraggedPinnedNode(id: string): void {
        this.lastDraggedPinnedNode = id;
    }

    pinLastDraggedPinnedNode(): void {
        if (!this.lastDraggedPinnedNode) return;
        this.pinNode(this.lastDraggedPinnedNode);
        this.lastDraggedPinnedNode = null;
    }

    // ================================= DEBUG =================================

    printDisconnectedNodes() {
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