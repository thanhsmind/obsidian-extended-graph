import { MarkdownRenderer, TFile } from "obsidian";
import { Assets, Graphics, IPointData, Rectangle, Texture } from "pixi.js";
import { GraphNode } from "obsidian-typings";
import {
    AbstractSet,
    ExtendedGraphAttachmentNode,
    ExtendedGraphFileNode,
    ExtendedGraphNode,
    ExtendedGraphUnresolvedNode,
    FileNodeGraphicsWrapper,
    getBackgroundColor,
    getFile,
    getFileInteractives,
    GraphInstances,
    InteractiveManager,
    Media,
    NodeShape,
    Pinner,
    ExtendedGraphInstances
} from "src/internal";
import { ExtendedGraphTagNode } from "../extendedElements/extendedGraphTagNode";
import { AttachmentNodeGraphicsWrapper } from "../graphicElements/nodes/attachmentNodeGraphicsWrapper";
import { OutlineFilter } from "@pixi/filter-outline";


export class NodesSet extends AbstractSet<GraphNode> {
    extendedElementsMap: Map<string, ExtendedGraphNode>;
    selectedNodes: Record<string, { node: GraphNode, filter: OutlineFilter, originX: number, originY: number }> = {};

    // ============================== CONSTRUCTOR ==============================

    constructor(instances: GraphInstances, managers: InteractiveManager[]) {
        super(instances, managers);

        this.coreCollection = this.instances.renderer.nodes;
    }

    // ================================ LOADING ================================

    override load(id?: string) {
        if (this.instances.settings.externalLinks !== "none") {
            if (id) {
                this.cacheExternalLinks(id).then((linksAdded) => {
                    if (linksAdded) this.instances.engine.render();
                });
            }
            else {
                this.cacheAllExternalLinks().then((linksAdded) => {
                    if (linksAdded.some(r => r)) { // Only rerender if external links have been added
                        this.instances.engine.render();
                    }
                });
            }
        }
        return super.load(id);
    }

    protected override handleMissingElement(extendedNode: ExtendedGraphNode): void {
        this.instances.layersManager?.addNode(extendedNode.id);
        this.applyBackgroundColor(extendedNode);
        this.loadAsset(extendedNode);
    }

    private applyBackgroundColor(extendedNode: ExtendedGraphNode) {
        const backgroundColor = getBackgroundColor(this.instances.renderer);
        if (!extendedNode.graphicsWrapper) return;
        extendedNode.graphicsWrapper.updateOpacityLayerColor(backgroundColor);
    }

    // ================================ IMAGES =================================

    private loadAsset(extendedNode: ExtendedGraphNode): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['imagesFromProperty']
            && !this.instances.settings.enableFeatures[this.instances.type]['imagesFromEmbeds']
            && !this.instances.settings.enableFeatures[this.instances.type]['imagesForAttachments']
            && !this.instances.settings.enableFeatures[this.instances.type]['icons']) return;


        this.getImageURI(extendedNode).then(imageURI => {
            if (imageURI) {
                if (imageURI.type === "image") {
                    Assets.load(imageURI.uri).then((texture: Texture) => {
                        this.initNodeImages(extendedNode, texture);
                    });
                }
                else if (imageURI.type === "icon") {
                    extendedNode.graphicsWrapper?.initIcon();
                }
            }
        });
    }

    private async getImageURI(extendedNode: ExtendedGraphNode): Promise<{ uri: string, type: 'icon' | 'image' } | null> {
        if (!extendedNode.graphicsWrapper) return null;

        let imageUri: string | null = null;

        // Priority to images
        if (this.instances.settings.enableFeatures[this.instances.type]['imagesFromProperty']
            || this.instances.settings.enableFeatures[this.instances.type]['imagesFromEmbeds']
            || this.instances.settings.enableFeatures[this.instances.type]['imagesForAttachments']) {

            if (this.instances.settings.enableFeatures[this.instances.type]['imagesFromProperty']
                && (extendedNode.coreElement.type === ""
                    || extendedNode.coreElement.type === "focused")) {
                for (const property of this.instances.settings.imageProperties) {
                    imageUri = await Media.getImageUriFromProperty(property, extendedNode.id);
                    if (imageUri) break;
                }
            }
            if (!imageUri && this.instances.settings.enableFeatures[this.instances.type]['imagesFromEmbeds']
                && (extendedNode.coreElement.type === ""
                    || extendedNode.coreElement.type === "focused")) {
                imageUri = await Media.getImageUriFromEmbeds(extendedNode.id);
            }
            if (this.instances.settings.enableFeatures[this.instances.type]['imagesForAttachments']
                && extendedNode.coreElement.type === "attachment") {
                imageUri = await Media.getImageUriForAttachment(extendedNode.id);
            }

            if (imageUri) return { uri: imageUri, type: 'image' }
        }

        // Then, icons (or emojis)
        if (this.instances.settings.enableFeatures[this.instances.type]['icons']) {
            const icon = extendedNode.icon;
            if (icon?.svg || icon?.emoji) return { uri: "", type: "icon" }
        }

        return null;
    }

    private initNodeImages(extendedNode: ExtendedGraphNode, texture: Texture): void {
        if (!extendedNode.graphicsWrapper) return;
        if (extendedNode.coreElement.type === "tag" || extendedNode.coreElement.type === "unresolved") return;

        try {
            switch (extendedNode.coreElement.type) {
                case "attachment":
                    (extendedNode.graphicsWrapper as AttachmentNodeGraphicsWrapper).initNodeImage(texture);
                    break;

                case "":
                case "focused":
                    if ('initNodeImage' in extendedNode.graphicsWrapper) {
                        (extendedNode.graphicsWrapper as FileNodeGraphicsWrapper).initNodeImage(texture);
                    }
                    break;
            }
        }
        catch {

        }
    }

    // =========================== EXTENDED ELEMENTS ===========================

    protected override createExtendedElement(node: GraphNode): ExtendedGraphNode {
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
        else if (node.type === "attachment") {
            extendedGraphNode = new ExtendedGraphAttachmentNode(
                this.instances,
                node,
                types,
                [...this.managers.values()]
            );
        }
        else if (node.type === "unresolved") {
            extendedGraphNode = new ExtendedGraphUnresolvedNode(
                this.instances,
                node
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
        return extendedGraphNode;
    }

    // ================================ GETTERS ================================

    protected override getID(element: GraphNode): string {
        return element.id;
    }

    protected override getTypesFromFile(key: string, element: GraphNode, file: TFile): Set<string> {
        return getFileInteractives(key, file, this.instances.settings);
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


    // ================================== CSS ==================================

    updateOpacityLayerColor() {
        const color = getBackgroundColor(this.instances.renderer);
        this.extendedElementsMap.forEach(extendedNode => {
            extendedNode.graphicsWrapper?.updateOpacityLayerColor(color);
        });
    }

    onCSSChange(): void {
        const color = getBackgroundColor(this.instances.renderer);
        this.extendedElementsMap.forEach(extendedNode => {
            extendedNode.graphicsWrapper?.updateOpacityLayerColor(color);
            extendedNode.graphicsWrapper?.updateIconBackgroundLayerColor(color);
            extendedNode.extendedText.graphicsWrapper?.updateTextBackgroundColor(color);
            extendedNode.extendedText.updateTextStyle();
        });
    }

    // =============================== EMPHASIZE ===============================

    /**
     * Highlights or unhighlights a node based on the provided file.
     * @param file - The file corresponding to the node.
     * @param emphasize - Whether to highlight or unhighlight the node.
     */
    emphasizeNode(file: { path: string }, emphasize: boolean): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['focus']) return;

        const extendedNode = this.extendedElementsMap.get(file.path);
        if (!extendedNode || !extendedNode.graphicsWrapper) return;

        extendedNode.graphicsWrapper.pixiElement.scale.set(emphasize ? ExtendedGraphInstances.settings.focusScaleFactor : 1);
    }

    // =============================== PIN NODES ===============================

    isNodePinned(id: string): boolean | undefined {
        const extendedNode = this.instances.nodesSet.extendedElementsMap.get(id);
        if (!extendedNode) return;
        return extendedNode.isPinned;
    }

    pinSelectedNodes() {
        const pinner = new Pinner(this.instances);
        for (const id in this.selectedNodes) {
            pinner.pinNode(id);
        }
    }

    unpinSelectedNodes() {
        const pinner = new Pinner(this.instances);
        for (const id in this.selectedNodes) {
            pinner.unpinNode(id);
        }
    }

    // ============================= SELECT NODES ==============================

    selectNodes(bounds: Rectangle) {
        const selectedNodes = this.instances.renderer.nodes.filter(node =>
            node.circle && bounds.contains(node.circle.x, node.circle.y));

        for (const coreNode of selectedNodes) {
            if (coreNode.circle) {
                const filter = new OutlineFilter(
                    3, this.instances.renderer.colors.fillHighlight.rgb, 0.1, 1, false
                );

                if (coreNode.circle.filters) {
                    if (coreNode.id in this.selectNodes) {
                        coreNode.circle.filters.remove(filter);
                    }
                    coreNode.circle.filters.push(filter);
                }
                else {
                    coreNode.circle.filters = [filter];
                }

                this.selectedNodes[coreNode.id] = {
                    node: coreNode,
                    filter: filter,
                    originX: coreNode.circle.x,
                    originY: coreNode.circle.y
                };
            }
        }
    }

    unselectNodes() {
        for (const id in this.selectedNodes) {
            const coreNode = this.selectedNodes[id].node;
            if (!coreNode.circle) continue;

            // Remove filter
            coreNode.circle?.filters?.remove(this.selectedNodes[id].filter);
            this.selectedNodes[id].filter.destroy();
        }
        this.selectedNodes = {};
        this.instances.renderer.changed();
    }

    moveSelectedNodes(pos: IPointData) {
        if (!this.instances.renderer.dragNode) {
            return;
        }

        if (!this.instances.dispatcher.inputsManager.isDragging) {
            this.instances.dispatcher.inputsManager.isDragging = true;

            for (const id in this.selectedNodes) {
                const coreNode = this.selectedNodes[id].node;
                if (!coreNode.circle) continue;

                this.selectedNodes[id].originX = coreNode.circle.x;
                this.selectedNodes[id].originY = coreNode.circle.y;
            }
        }

        if (!(this.instances.renderer.dragNode.id in this.selectedNodes)) {
            return;
        }

        const translation = {
            x: pos.x - this.selectedNodes[this.instances.renderer.dragNode.id].originX,
            y: pos.y - this.selectedNodes[this.instances.renderer.dragNode.id].originY
        };

        for (const id in this.selectedNodes) {
            if (id === this.instances.renderer.dragNode.id) continue;

            const coreNode = this.selectedNodes[id].node;
            if (!coreNode.circle) continue;

            coreNode.fx = this.selectedNodes[id].originX + translation.x;
            coreNode.fy = this.selectedNodes[id].originY + translation.y;
            this.instances.renderer.worker.postMessage({
                alpha: .3,
                alphaTarget: .3,
                run: true,
                forceNode: {
                    id: coreNode.id,
                    x: coreNode.fx,
                    y: coreNode.fy
                }
            });
        }
    }

    stopMovingSelectedNodes() {
        for (const id in this.selectedNodes) {
            const coreNode = this.selectedNodes[id].node;

            if ((coreNode.fx !== null || coreNode.fy !== null) && !this.isNodePinned(coreNode.id)) {
                this.instances.renderer.worker.postMessage({
                    alphaTarget: 0,
                    forceNode: {
                        id: coreNode.id,
                        x: null,
                        y: null
                    }
                });
                coreNode.fx = null;
                coreNode.fy = null;
            }
        }
    }

    // ======================= EXTERNAL LINKS ===========================

    cachedExternalLinks: Record<string, URL[]> = {};

    private async cacheAllExternalLinks(): Promise<boolean[]> {
        const promises: Promise<boolean>[] = [];
        for (const id in this.instances.renderer.nodeLookup) {
            promises.push(this.cacheExternalLinks(id));
        }
        return Promise.all(promises);
    }

    async cacheExternalLinks(id: string, force: boolean = false): Promise<boolean> {
        if (!(this.instances.renderer.nodeLookup[id]?.type === ""
            || (this.instances.renderer.nodeLookup[id]?.type === "focused" && id.endsWith(".md")))) return false;
        if (!force && (id in this.cachedExternalLinks)) return false;

        const file = getFile(id);
        if (!file) {
            this.cachedExternalLinks[id] = [];
            return false;
        }

        const data = await ExtendedGraphInstances.app.vault.cachedRead(file);
        const div = createDiv();
        await MarkdownRenderer.render(
            ExtendedGraphInstances.app,
            data,
            div,
            id,
            ExtendedGraphInstances.plugin
        );

        const links: URL[] = [];
        for (const link of Array.from(div.getElementsByClassName("external-link"))) {
            const href = link.getAttr("href");
            if (href) {
                links.push(new URL(href));
            }
        }
        this.cachedExternalLinks[id] = links;

        return links.length > 0;
    }

    convertExternalLink(url: URL): { domain?: string, href?: string } {
        switch (this.instances.settings.externalLinks) {
            case "domain":
                return { domain: url.hostname };
            case "href":
                return { href: url.origin + url.pathname };
            case "domain_and_href":
                return { domain: url.hostname, href: url.origin + url.pathname };
            case "none":
                return {};
        }
    }

    getExternalLinks(id: string): { domain?: string, href?: string }[] {
        if (id in this.cachedExternalLinks) {
            return this.cachedExternalLinks[id].map(url => this.convertExternalLink(url)).unique();
        }

        return [];
    }
}