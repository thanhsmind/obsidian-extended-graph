import { TFolder } from "obsidian";
import { GraphNode } from "obsidian-typings";
import path from "path";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { FOLDER_KEY, getFile, getFileInteractives, GraphInstances, InteractiveManager, INVALID_KEYS, PluginInstances, randomColor, rgb2hex } from "src/internal";

export class FolderBlob {
    readonly path: string;
    nodes: GraphNode[] = [];
    area: Graphics;
    text: Text;
    textStyle: TextStyle;
    color: string;
    BBox: { left: number, right: number, top: number, bottom: number };

    constructor(path: string, color?: string) {
        this.path = path;
        this.color = color ? color : randomColor();
    }

    initGraphics(showFullPath: boolean) {
        this.area = new Graphics();
        this.area.eventMode = 'none';

        this.textStyle = new TextStyle({
            fontSize: PluginInstances.folderStyle.textStyle.fontSize,
            fill: this.color,
            fontFamily: PluginInstances.folderStyle.textStyle.textStyle.fontFamily,
            fontStyle: PluginInstances.folderStyle.textStyle.textStyle.fontStyle,
            fontVariant: PluginInstances.folderStyle.textStyle.textStyle.fontVariant,
            fontWeight: PluginInstances.folderStyle.textStyle.textStyle.fontWeight,
            letterSpacing: PluginInstances.folderStyle.textStyle.textStyle.letterSpacing,
            wordWrap: !0,
            wordWrapWidth: 300,
            align: PluginInstances.folderStyle.textStyle.align
        });
        this.text = new Text(showFullPath ? this.path : path.basename(this.path), this.textStyle);
        this.area.addChild(this.text);
    }

    clearGraphics() {
        this.area.removeFromParent();
        this.area.destroy();
        this.text?.destroy();
    }

    updateGraphics(rendererScale: number) {
        if (this.nodes.length > 0) {
            this.draw();
            this.placeText(rendererScale);
            this.text.visible = true;
        }
        else {
            this.area.clear();
            this.text.visible = false;
        }
    }

    addNode(node: GraphNode) {
        if (this.nodes.includes(node)) return;
        this.nodes.push(node);
    }

    removeNode(node: GraphNode) {
        this.nodes.remove(node);
    }

    private draw() {
        this.computeBox();
        this.drawBox();
    }

    private drawBox() {
        this.area.clear();

        this.area.lineStyle(
            PluginInstances.folderStyle.borderWidth,
            this.color,
            PluginInstances.folderStyle.strokeOpacity,
            1
        ).beginFill(this.color, PluginInstances.folderStyle.fillOpacity)
            .drawRoundedRect(
                this.BBox.left,
                this.BBox.top,
                (this.BBox.right - this.BBox.left),
                (this.BBox.bottom - this.BBox.top),
                PluginInstances.folderStyle.radius)
            .endFill();
    }

    private computeBox() {
        let xMin = this.nodes[0].x;
        let xMax = this.nodes[0].x;
        let yMin = this.nodes[0].y;
        let yMax = this.nodes[0].y;

        for (const node of this.nodes) {
            if (node.x < xMin) xMin = node.x;
            else if (node.x > xMax) xMax = node.x;
            if (node.y < yMin) yMin = node.y;
            else if (node.y > yMax) yMax = node.y;
        }

        this.BBox = {
            left: xMin - 50 - PluginInstances.folderStyle.padding.left,
            right: xMax + 50 + PluginInstances.folderStyle.padding.right,
            top: yMin - 50 - PluginInstances.folderStyle.padding.top,
            bottom: yMax + 50 + PluginInstances.folderStyle.padding.bottom,
        };
    }

    private placeText(scale: number) {
        const t = Math.min(scale, 5);
        this.text.style.fontSize = PluginInstances.folderStyle.textStyle.fontSize * t;
        this.text.style.letterSpacing = PluginInstances.folderStyle.textStyle.textStyle.letterSpacing * t;
        switch (PluginInstances.folderStyle.textStyle.align) {
            case 'center':
                this.text.anchor.set(0.5, 0);
                this.text.x = this.BBox.left + 0.5 * (this.BBox.right - this.BBox.left);
                break;
            case 'left':
                this.text.anchor.set(0, 0);
                this.text.x = this.BBox.left + PluginInstances.folderStyle.padding.left;
                break;
            case 'right':
                this.text.anchor.set(1, 0);
                this.text.x = this.BBox.right - PluginInstances.folderStyle.padding.right;
                break;
        }

        this.text.y = this.BBox.top + PluginInstances.folderStyle.padding.top;
        this.text.scale.set(1 / t);
    }
}

export class FoldersSet {
    readonly instances: GraphInstances;

    // Interactive manager
    managers: Map<string, InteractiveManager>;

    // Set of blobs
    foldersMap = new Map<string, FolderBlob>();

    // Graphics
    container: Container;

    // ============================== CONSTRUCTOR ==============================

    constructor(instances: GraphInstances, managers: InteractiveManager[]) {
        this.instances = instances;
        this.initializeManager(managers);
    }

    private initializeManager(managers: InteractiveManager[]) {
        this.managers = new Map<string, InteractiveManager>();
        for (const manager of managers) {
            this.managers.set(manager.name, manager);
        }
    }

    // ================================ LOADING ================================

    load(): void {
        this.initGraphics();
        this.addMissingFolders();
    }

    initGraphics(): void {
        if (this.container && !this.container.destroyed) return;
        this.container = new Container();
        this.container.name = "Blobs";
        this.instances.renderer.hanger.addChildAt(this.container, 0);

        for (const blob of this.foldersMap.values()) {
            if (blob.area.destroyed) {
                this.loadFolder(FOLDER_KEY, blob.path);
            }
        }
    }

    private addMissingFolders(): void {
        for (const [key, manager] of this.managers) {
            let missingFolders = new Set<string>();

            for (const node of this.instances.renderer.nodes) {
                const file = getFile(node.id);
                if (!file) continue;
                if (this.foldersMap.has(file.path)) continue;

                const interactives = getFileInteractives(FOLDER_KEY, file);
                this.addInteractivesToSet(key, interactives, missingFolders);
            }

            manager.addTypes(missingFolders);
        }
    }

    private addInteractivesToSet(key: string, interactives: Set<string>, missingFolders: Set<string>) {
        const manager = this.managers.get(key);
        if (!manager) return;

        let hasType = false;
        for (const interactive of interactives) {
            if (!manager.interactives.has(interactive)) {
                if (this.isFolderValid(interactive)) {
                    missingFolders.add(interactive);
                    hasType = true;
                }
            }
            else {
                hasType = true;
            }
        }
        if (!hasType && !manager.interactives.has(this.instances.settings.interactiveSettings[FOLDER_KEY].noneType)) {
            missingFolders.add(this.instances.settings.interactiveSettings[FOLDER_KEY].noneType);
        }
    }

    private isFolderValid(type: string): boolean {
        if (this.instances.settings.interactiveSettings[FOLDER_KEY].unselected.includes(type)) return false;
        if (INVALID_KEYS[FOLDER_KEY].includes(type)) return false;
        return true;
    }

    // =============================== UNLOADING ===============================

    unload(): void {
        this.container.destroy({ children: true });
        this.container.removeFromParent();
        this.foldersMap.clear();
    }

    // ========================= ADD AND REMOVE FOLDER =========================

    loadFolder(key: string, path: string): void {
        const manager = this.managers.get(key);
        const folder = PluginInstances.app.vault.getFolderByPath(path);
        if (folder && manager) {
            let blob = this.foldersMap.get(path);
            let blobExists = true;
            if (!blob) {
                blobExists = false;
                blob = new FolderBlob(path, manager ? rgb2hex(manager.getColor(path)) : undefined);
                blob.initGraphics(this.instances.settings.folderShowFullPath);
            }
            else if (blob.area.destroyed || !blob.area.parent) {
                blobExists = false;
                blob.initGraphics(this.instances.settings.folderShowFullPath);
            }
            const nodes = this.getNodesInFolder(folder);
            for (const node of nodes) {
                blob.addNode(node);
            }
            if (blob.nodes.length > 0) {
                this.foldersMap.set(path, blob);
                blob.updateGraphics(this.instances.renderer.scale);
                if (!blobExists) {
                    this.container.addChild(blob.area);
                }
            }
        }
    }

    private getNodesInFolder(folder: TFolder): GraphNode[] {
        const nodes: GraphNode[] = [];
        for (const file of folder.children) {
            if (file instanceof TFolder) {
                nodes.push(...this.getNodesInFolder(file));
            }
            else {
                const node = this.instances.renderer.nodes.find(n => n.id === file.path);
                if (node) nodes.push(node);
            }
        }
        return nodes;
    }

    removeFolder(path: string): void {
        this.foldersMap.get(path)?.clearGraphics();
        this.foldersMap.delete(path);
    }

    // ============================ UPDATE GRAPHICS ============================

    updateGraphics() {
        for (const [path, blob] of this.foldersMap) {
            blob.updateGraphics(this.instances.renderer.scale);
        }
    }

    updateColor(key: string, path: string) {
        const manager = this.managers.get(key);
        const folderBlob = this.foldersMap.get(path);
        if (!folderBlob || !manager) return;
        folderBlob.color = rgb2hex(manager.getColor(path));
        folderBlob.updateGraphics(this.instances.renderer.scale);
    }

    // ================================ GETTERS ================================

    hasMoreThanOneNode(key: string, path: string): boolean {
        const blob = this.foldersMap.get(path);

        if (blob) return blob.nodes.length > 1;

        const folder = PluginInstances.app.vault.getFolderByPath(path);

        // folder.getFileCount() is probably more efficient but counts files that are not displayed in the graph
        // this.getNodesInFolder(folder).length is more accurate but may be slower

        return folder ? this.getNodesInFolder(folder).length > 1 : false;
    }
}