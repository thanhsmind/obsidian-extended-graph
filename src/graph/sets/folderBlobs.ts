import { TFile, TFolder } from "obsidian";
import { GraphNode } from "obsidian-typings";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { FOLDER_KEY, getFile, getFileInteractives, Graph, InteractiveManager, INVALID_KEYS, PluginInstances, randomColor, rgb2hex } from "src/internal";

export class FolderBlob {
    readonly path: string;
    nodes: GraphNode[] = [];
    area: Graphics;
    text: Text;
    color: string;
    strokeOpacity: number = 0.5;
    fillOpacity: number = 0.03;
    radius: number = 50;
    borderWidth: number = 2;
    textStyle: TextStyle;
    BBox: {left: number, right: number, top: number, bottom: number};

    constructor(path: string, color?: string) {
        this.path = path;

        this.color = color ? color : randomColor();

        this.area = new Graphics();
        this.area.eventMode = 'none';
        
        this.textStyle = new TextStyle({
            fontSize: 14,
            fill: this.color,
            fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Microsoft YaHei Light", sans-serif',
            wordWrap: !0,
            wordWrapWidth: 300,
            align: "center"
        });
        this.text = new Text(path, this.textStyle);
        this.text.anchor.set(0.5, 0);
        this.area.addChild(this.text);
    }

    clearGraphics() {
        this.area.removeFromParent();
        this.area.destroy();
        this.text.destroy();
    }

    updateGraphics(scale: number) {
        this.draw();
        this.placeText(scale);
    }

    addNode(node: GraphNode) {
        this.nodes.push(node);
    }

    private draw() {
        this.computeBox();
        this.drawBox();
    }

    private drawBox() {
        this.area.clear();

        this.area.lineStyle(this.borderWidth, this.color, this.strokeOpacity)
            .beginFill(this.color, this.fillOpacity)
            .drawRoundedRect(this.BBox.left, this.BBox.top, (this.BBox.right - this.BBox.left), (this.BBox.bottom - this.BBox.top), this.radius)
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
            left: xMin - 50,
            right: xMax + 50,
            top: yMin - 50,
            bottom: yMax + 50,
        };
    }

    private placeText(scale: number) {
        const t = Math.min(scale, 5);
        this.text.style.fontSize = 14 * t;
        this.text.x = this.BBox.left +  0.5 * (this.BBox.right - this.BBox.left);
        this.text.y = this.BBox.top;
        this.text.scale.set(1 / t);
    }
}

export class FoldersSet {
    // Parent graph
    readonly graph: Graph;

    // Interactive manager
    managers: Map<string, InteractiveManager>;

    // Set of blobs
    foldersMap = new Map<string, FolderBlob>();

    // Graphics
    container: Container;

    // ============================== CONSTRUCTOR ==============================

    constructor(graph: Graph, managers: InteractiveManager[]) {
        this.graph = graph;
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
        this.initContainer();
        this.addMissingFolders();
    }

    private initContainer(): void {
        this.container = new Container();
        this.container.name = "Blobs";
        (this.graph.renderer.px.stage.children[1] as Container).addChildAt(this.container, 0);
    }

    private addMissingFolders(): void {
        for (const [key, manager] of this.managers) {
            let missingFolders = new Set<string>();
    
            for (const node of this.graph.renderer.nodes) {
                if (this.foldersMap.has(node.id)) continue;
    
                const file = getFile(PluginInstances.app, node.id);
                if (!file) continue;
    
                const interactives = getFileInteractives(FOLDER_KEY, PluginInstances.app, file);
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
        if (!hasType && !manager.interactives.has(this.graph.staticSettings.interactiveSettings[FOLDER_KEY].noneType)) {
            missingFolders.add(this.graph.staticSettings.interactiveSettings[FOLDER_KEY].noneType);
        }
    }
    
    private isFolderValid(type: string): boolean {
        if (this.graph.staticSettings.interactiveSettings[FOLDER_KEY].unselected.includes(type)) return false;
        if (INVALID_KEYS[FOLDER_KEY].includes(type)) return false;
        return true;
    }

    // =============================== UNLOADING ===============================

    unload(): void {
        this.container.destroy({children: true});
        this.container.removeFromParent();
        this.foldersMap.clear();
    }

    // ========================= ADD AND REMOVE FOLDER =========================

    addFolder(key: string, path: string): void {
        this.removeFolder(path);
        const manager = this.managers.get(key);
        const folder = PluginInstances.app.vault.getFolderByPath(path);
        if (folder && manager) {
            const blob = new FolderBlob(path, manager ? rgb2hex(manager.getColor(path)) : undefined);
            for (const file of folder.children) {
                if (file instanceof TFile) {
                    const node = this.graph.nodesSet.extendedElementsMap.get(file.path)?.coreElement;
                    if (node) blob.addNode(node);
                }
                else if (file instanceof TFolder) {
                    // it's a nested folder
                }
            }
            if (blob.nodes.length > 0) {
                this.foldersMap.set(path, blob);
                this.container.addChild(blob.area);
                blob.updateGraphics(this.graph.renderer.scale);
            }
        }
    }

    removeFolder(path: string): void {
        this.foldersMap.get(path)?.clearGraphics();
        this.foldersMap.delete(path);
    }

    // ============================ UPDATE GRAPHICS ============================

    updateGraphics() {
        for (const [path, blob] of this.foldersMap) {
            blob.updateGraphics(this.graph.renderer.scale);
        }
    }

    updateColor(key: string, path: string) {
        const manager = this.managers.get(key);
        const folderBlob = this.foldersMap.get(path);
        if (!folderBlob || !manager) return;
        folderBlob.color = rgb2hex(manager.getColor(path));
        folderBlob.updateGraphics(this.graph.renderer.scale);
    }
}