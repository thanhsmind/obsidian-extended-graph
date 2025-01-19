import { TAbstractFile, TFile } from "obsidian";
import { getBackgroundColor, getFile, getFileInteractives, getImageUri } from "src/helperFunctions";
import { Assets, Texture } from "pixi.js";
import { DisconnectionCause, INVALID_KEYS, LINK_KEY } from "src/globalVariables";
import { GraphNode } from "obsidian-typings";
import { ExtendedGraphNode } from "../extendedElements/extendedGraphNode";
import { AbstractSet } from "../abstractAndInterfaces/abstractSet";
import { InteractiveManager } from "../interactiveManager";
import { Graph } from "../graph";
import { ColorReplacement } from "../graphicElements/nodes/colorsReplacement";

export class NodesSet extends AbstractSet<GraphNode> {
    extendedElementsMap: Map<string, ExtendedGraphNode>;
    colorReplacement?: ColorReplacement;

    // ============================== CONSTRUCTOR ==============================

    constructor(graph: Graph, managers: InteractiveManager[]) {
        super(graph, managers);


        if (false && this.graph.staticSettings.enableShapes) {
            // Should not be needed anymore, because nodes are scaled downed instead or recolorized
            this.colorReplacement = new ColorReplacement(this.graph.renderer, this.graph.engine);
        }

        this.coreCollection = this.graph.renderer.nodes;
    }

    // ================================ LOADING ================================

    override load(): void {
        super.load();
        this.colorReplacement?.shortcutColors();
    }

    protected override handleMissingElements(ids: Set<string>): void {
        this.loadAssets(ids);
    }

    // =============================== UNLOADING ===============================

    override unload() {
        super.unload();
        this.colorReplacement?.restoreColors();
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
            const imageUri = getImageUri(this.graph.dispatcher.graphsManager.plugin.app, this.graph.staticSettings.imageProperty, id);
            if (imageUri && this.graph.staticSettings.enableImages) {
                imageURIs.set(id, imageUri);
            } else {
                emptyTextures.push(id);
            }
        }
        return { imageURIs, emptyTextures };
    }

    private initNodesGraphics(imageURIs: Map<string, string>, emptyTextures: string[]) {
        const backgroundColor = getBackgroundColor(this.graph.renderer);
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
        if (!extendedNode) return;
        extendedNode.graphicsWrapper?.initNodeImage(texture);
        extendedNode.graphicsWrapper?.nodeImage?.updateOpacityLayerColor(backgroundColor);
    }

    // =========================== EXTENDED ELEMENTS ===========================

    protected override createExtendedElement(node: GraphNode): void {
        const id = node.id;

        const types = new Map<string, Set<string>>();
        for (const [key, manager] of this.managers) {
            types.set(key, this.getTypes(key, node));
        }

        const extendedGraphNode = new ExtendedGraphNode(
            node,
            types,
            [...this.managers.values()],
            this.graph.dispatcher.graphsManager.plugin.app,
            this.graph.staticSettings,
            this.colorReplacement
        );

        this.extendedElementsMap.set(id, extendedGraphNode);
        this.connectedIDs.add(id);
    }

    // ================================ GETTERS ================================

    protected override getID(element: GraphNode): string {
        return element.id;
    }

    protected override getTypesFromFile(key: string, element: GraphNode, file: TFile): Set<string> {
        return getFileInteractives(key, this.graph.dispatcher.graphsManager.plugin.app, file);
    }

    protected override isTypeValid(key: string, type: string): boolean {
        if (this.graph.staticSettings.interactiveSettings[key].unselected.includes(type)) return false;
        if (INVALID_KEYS[key].includes(type)) return false;
        return true;
    }
    
    protected getAbstractFile(node: GraphNode): TFile | null {
        return getFile(this.graph.dispatcher.graphsManager.plugin.app, node.id);
    }

    // ============================= INTERACTIVES ==============================
    
    /**
     * Reset arcs for each node
     */
    resetArcs(key: string): void {
        if (!this.graph.staticSettings.enableTags) return;
        for (const [id, extendedElement] of this.extendedElementsMap) {
            const file = getFile(extendedElement.app, id);
            const arcCicle = extendedElement.graphicsWrapper?.managerGraphicsMap?.get(key);
            if (!arcCicle || !file) continue;

            arcCicle.clearGraphics();
            arcCicle.setTypes(getFileInteractives(key, extendedElement.app, file));
            arcCicle.initGraphics();
            arcCicle.updateGraphics();
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

    // ================================ COLORS =================================
    
    /**
     * Update the background color. Called when the theme changes.
     */
    updateOpacityLayerColor(): void {
        const color = getBackgroundColor(this.graph.renderer);
        this.extendedElementsMap.forEach(extendedNode => {
            extendedNode.graphicsWrapper?.nodeImage?.updateOpacityLayerColor(color);
        });
    }

    // =============================== EMPHASIZE ===============================

    /**
     * Highlights or unhighlights a node based on the provided file.
     * @param file - The file corresponding to the node.
     * @param emphasize - Whether to highlight or unhighlight the node.
     */
    emphasizeNode(file: TFile, emphasize: boolean): void {
        if (!this.graph.staticSettings.enableFocusActiveNote) return;

        const extendedNode = this.extendedElementsMap.get(file.path);
        if (!extendedNode) return;

        if (emphasize) {
            let color = this.graph.renderer.colors.fillFocused.rgb;
            if (this.graph.staticSettings.enableShapes && this.colorReplacement) {
                color = this.colorReplacement.copyColors.fillFocused.rgb;
            }
            extendedNode.graphicsWrapper?.emphasize(this.graph.dynamicSettings.focusScaleFactor, color);
        } else {
            extendedNode.graphicsWrapper?.emphasize(1);
        }
    }

    // =============================== PIN NODES ===============================

    setPinnedNodes(ids: Record<string, {x: number, y: number}>) {
        for (const [id, extendedNode] of this.extendedElementsMap) {
            const isPinned = ids.hasOwnProperty(id);
            if (isPinned && !extendedNode.isPinned) {
                this.graph.nodesSet.pinNode(id, ids[id].x, ids[id].y);
            }
            else if (!isPinned && extendedNode.isPinned) {
                this.graph.nodesSet.unpinNode(id);
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
        this.graph.renderer.worker.postMessage({
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
        this.graph.renderer.worker.postMessage({
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