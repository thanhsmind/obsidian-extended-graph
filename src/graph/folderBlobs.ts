import { TFile, TFolder } from "obsidian";
import { Graph } from "./graph";
import { GraphNode } from "obsidian-typings";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { randomColor, rgb2hex } from "src/colors/colors";
import { InteractiveManager } from "./interactiveManager";
import { getFile, getFileInteractives } from "src/helperFunctions";
import { FOLDER_KEY, INVALID_KEYS } from "src/globalVariables";

export class FolderBlob {
    readonly path: string;
    nodes: GraphNode[] = [];
    area: Graphics;
    text: Text;
    color: string;
    textStyle: TextStyle;
    BBox: {xMin: number, xMax: number, yMin: number, yMax: number};

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

        this.area.lineStyle(2, this.color, 0.5)
            .beginFill(this.color, 0.03)
            .drawRoundedRect(this.BBox.xMin, this.BBox.yMin, (this.BBox.xMax - this.BBox.xMin), (this.BBox.yMax - this.BBox.yMin), 50)
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
            xMin: xMin - 50,
            xMax: xMax + 50,
            yMin: yMin - 50,
            yMax: yMax + 50,
        };
    }

    private placeText(scale: number) {
        const t = Math.min(scale, 5);
        this.text.style.fontSize = 14 * t;
        this.text.x = this.BBox.xMin +  0.5 * (this.BBox.xMax - this.BBox.xMin);
        this.text.y = this.BBox.yMin;
        this.text.scale.set(1 / t);
    }
}

export class FoldersSet {
    // Parent graph
    readonly graph: Graph;

    // Interactive manager
    manager: InteractiveManager | null;

    // Set of blobs
    foldersMap = new Map<string, FolderBlob>();

    // Graphics
    container: Container;

    // ============================== CONSTRUCTOR ==============================

    constructor(graph: Graph, manager: InteractiveManager | undefined) {
        this.graph = graph;
        this.initializeManager(manager);
    }

    private initializeManager(manager: InteractiveManager | undefined) {
        this.manager = manager ? manager : null;
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
        if (!this.manager) return;

        let missingFolders = new Set<string>();

        for (const node of this.graph.renderer.nodes) {
            if (this.foldersMap.has(node.id)) continue;

            const file = getFile(this.graph.dispatcher.graphsManager.plugin.app, node.id);
            if (!file) continue;

            const interactives = getFileInteractives(FOLDER_KEY, this.graph.dispatcher.graphsManager.plugin.app, file);
            this.addInteractivesToSet(interactives, missingFolders);
        }

        this.manager.addTypes(missingFolders);
    }

    private addInteractivesToSet(interactives: Set<string>, missingFolders: Set<string>) {
        let hasType = false;
        for (const interactive of interactives) {
            if (!this.manager?.interactives.has(interactive)) {
                if (this.isFolderValid(interactive)) {
                    missingFolders.add(interactive);
                    hasType = true;
                }
            }
            else {
                hasType = true;
            }
        }
        if (!hasType && !this.manager?.interactives.has(this.graph.staticSettings.interactiveSettings[FOLDER_KEY].noneType)) {
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

    addFolder(path: string): void {
        this.removeFolder(path);

        const folder = this.graph.dispatcher.graphsManager.plugin.app.vault.getFolderByPath(path);
        if (folder) {
            const blob = new FolderBlob(path, this.manager ? rgb2hex(this.manager.getColor(path)) : undefined);
            for (const file of folder.children) {
                if (file instanceof TFile) {
                    const node = this.graph.nodesSet.nodesMap.get(file.path)?.node;
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

    updateGraphics(path?: string) {
        if (path) {
            this.foldersMap.get(path)?.updateGraphics(this.graph.renderer.scale);
        }
        else {
            for (const [path, blob] of this.foldersMap) {
                blob.updateGraphics(this.graph.renderer.scale);
            }
        }
    }
}