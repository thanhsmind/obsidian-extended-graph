import { TFile } from "obsidian";
import { Assets, Texture } from "pixi.js";
import { GraphNode } from "obsidian-typings";
import { AbstractSet, DisconnectionCause, ExtendedGraphAttachmentNode, ExtendedGraphFileNode, ExtendedGraphNode, FileNodeGraphicsWrapper, getBackgroundColor, getFile, getFileInteractives, GraphInstances, InteractiveManager, PluginInstances } from "src/internal";
import { ExtendedGraphTagNode } from "../extendedElements/extendedGraphTagNode";
import { AttachmentNodeGraphicsWrapper } from "../graphicElements/nodes/attachmentNodeGraphicsWrapper";


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
        if (!this.instances.settings.enableFeatures[this.instances.type]['imagesFromProperty']
            && !this.instances.settings.enableFeatures[this.instances.type]['imagesFromEmbeds']
            && !this.instances.settings.enableFeatures[this.instances.type]['imagesForAttachments']) return;

        const backgroundColor = getBackgroundColor(this.instances.renderer);

        for (const id of ids) {
            this.getImageURIOrEmptyTextures(id).then(imageURI => {
                if (imageURI) {
                    Assets.load(imageURI).then((texture:Texture) => {
                        this.initNodeGraphics(id, texture, backgroundColor);
                    });
                }
                else {
                    this.initNodeGraphics(id, undefined, backgroundColor);
                }
            });
        }
    }

    private async getImageURIOrEmptyTextures(id: string): Promise<string | null> {
        const extendedNode = this.extendedElementsMap.get(id);
        if (!extendedNode || !extendedNode.graphicsWrapper) return null;

        let imageUri: string | null = null;

        if (this.instances.settings.enableFeatures[this.instances.type]['imagesFromProperty'] && extendedNode.coreElement.type === "") {
            imageUri = await this.getImageUriFromProperty(this.instances.settings.imageProperty, id);
        }
        if (!imageUri && this.instances.settings.enableFeatures[this.instances.type]['imagesFromEmbeds'] && extendedNode.coreElement.type === "") {
            imageUri = await this.getImageUriFromEmbeds(id);
        }
        if (this.instances.settings.enableFeatures[this.instances.type]['imagesForAttachments'] && extendedNode.coreElement.type === "attachment") {
            imageUri = await this.getImageUriForAttachment(id);
        }

        return imageUri;
    }

    private async getImageUriFromProperty(keyProperty: string, id: string): Promise<string | null> {
        const file = getFile(id);
        if (file) {
            const metadata = PluginInstances.app.metadataCache.getFileCache(file);
            const frontmatter = metadata?.frontmatter;
            let imageLink = null;
            if (frontmatter) {
                if (typeof frontmatter[keyProperty] === "string") {
                    imageLink = frontmatter[keyProperty]?.replace("[[", "").replace("]]", "");
                }
                else if (Array.isArray(frontmatter[keyProperty])) {
                    imageLink = frontmatter[keyProperty][0]?.replace("[[", "").replace("]]", "");
                }
                const imageFile = imageLink ? PluginInstances.app.metadataCache.getFirstLinkpathDest(imageLink, "."): null;
                if (imageFile) {
                    const src = PluginInstances.app.vault.getResourcePath(imageFile);
                    return this.getStaticImageUri(src);
                }
            }
        }
        return null;
    }

    private async getImageUriFromEmbeds(id: string): Promise<string | null> {
        const file = getFile(id);
        if (file) {
            const metadata = PluginInstances.app.metadataCache.getFileCache(file);
            const embeds = metadata?.embeds;
            if (embeds) {
                for (const embedCache of embeds) {
                    const imageFile = PluginInstances.app.metadataCache.getFirstLinkpathDest(embedCache.link, ".");
                    if (!imageFile) continue;
                    const uri = await this.getStaticImageUri(PluginInstances.app.vault.getResourcePath(imageFile));
                    if (uri) return uri;
                }
            }
        }
        return null;
    }

    private async getImageUriForAttachment(id: string): Promise<string | null> {
        const file = getFile(id);
        if (file) {
            return this.getStaticImageUri(PluginInstances.app.vault.getResourcePath(file));
        }
        return null;
    }

    private async getStaticImageUri(src: string): Promise<string | null> {
        // https://www.iana.org/assignments/media-types/media-types.xhtml
        const type = await this.getMediaType(src);
        if (!type) return null;

        if (['image/avif', 'image/webp', 'image/png', 'image/svg+xml', 'image/jpeg'].includes(type)) {
            return src;
        }
        else if (['image/gif'].includes(type)) {
            return this.getUriForGif(src);
        }
        else if (['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska'].includes(type)) {
            return this.getUriForVideo(src);
        }
        return null;
    }

    private async getUriForGif(src: string): Promise<string | null> {
        const canvas = createEl('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            let uri: string | undefined = undefined;

            const image = new Image();
            image.onload = () => {
                canvas.width = image.width;
                canvas.height = image.height;
                ctx.drawImage(image, 0, 0);
                uri = canvas.toDataURL();
            };
            image.src = src;

            let waitLoop = 0;
            await (async() => {
                while (uri === undefined && waitLoop < 5) {
                    waitLoop += 1;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            })();
            return uri ?? null;
        }
        return null;
    }

    private async getUriForVideo(src: string): Promise<string | null> {
        const canvas = createEl('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            let uri: string | undefined = undefined;

            const video = createEl('video');

            video.src = src;
            video.addEventListener('seeked', function() {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                uri = canvas.toDataURL();
            });
            video.onloadedmetadata = function() {
                if (video.duration) video.currentTime = video.duration / 2;
            };

            let waitLoop = 0;
            await (async() => {
                while (uri === undefined && waitLoop < 5) {
                    waitLoop += 1;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            })();
            return uri ?? null;
        }
        return null;
    }

    private async getMediaType(url: string): Promise<string | null> {
        let type: string | null = null;
        var xhr = new XMLHttpRequest();
        xhr.open('HEAD', url, true);
        xhr.onload = function() {
            type = xhr.getResponseHeader('Content-Type');
        };
        xhr.send();

        let waitLoop = 0;
        await (async() => {
            while (type === null && waitLoop < 5) {
                waitLoop += 1;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        })();
        return type;
    }

    private initNodeGraphics(id: string, texture: Texture | undefined, backgroundColor: Uint8Array): void {
        const extendedNode = this.extendedElementsMap.get(id);
        if (!extendedNode || !extendedNode.graphicsWrapper) return;
        try {
            switch (extendedNode.coreElement.type) {
                case "tag":
                    break;
                
                case "attachment":
                    (extendedNode.graphicsWrapper as AttachmentNodeGraphicsWrapper).initNodeImage(texture);
                    extendedNode.graphicsWrapper.updateOpacityLayerColor(backgroundColor);
                    break;
            
                default:
                    (extendedNode.graphicsWrapper as FileNodeGraphicsWrapper).initNodeImage(texture);
                    extendedNode.graphicsWrapper.updateOpacityLayerColor(backgroundColor);
                    break;
            }
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
        else if (node.type === "attachment") {
            extendedGraphNode = new ExtendedGraphAttachmentNode(
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