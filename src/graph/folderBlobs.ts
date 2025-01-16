import { Component, TFile, TFolder } from "obsidian";
import { Graph } from "./graph";
import { GraphNode } from "obsidian-typings";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { getFile } from "src/helperFunctions";
import { randomColor } from "src/colors/colors";

export class FolderBlob {
    readonly path: string;
    nodes: GraphNode[] = [];
    area: Graphics;
    text: Text;
    color: string;
    textStyle: TextStyle;
    BBox: {xMin: number, xMax: number, yMin: number, yMax: number};

    constructor(path: string) {
        this.path = path;

        this.color = randomColor();

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

    // Set of blobs
    blobsSet: Map<string, FolderBlob>;

    // Graphics
    container: Container;

    // ============================== CONSTRUCTOR ==============================

    constructor(graph: Graph) {
        // Parent graph
        this.graph = graph;

        // Set of blobs
        this.blobsSet = new Map<string, FolderBlob>();
    }

    

    // ================================ LOADING ================================

    load(): void {
        this.initContainer();
    }

    private initContainer(): void {
        this.container = new Container();
        this.container.name = "Blobs";
        (this.graph.renderer.px.stage.children[1] as Container).addChildAt(this.container, 0);
    }

    // =============================== UNLOADING ===============================

    unload(): void {
        this.container.destroy({children: true});
        this.container.removeFromParent();
        this.blobsSet.clear();
    }

    // ========================= ADD AND REMOVE FOLDER =========================

    addFolder(path: string): void {
        this.removeFolder(path);

        const folder = this.graph.dispatcher.graphsManager.plugin.app.vault.getFolderByPath(path);
        if (folder) {
            const blob = new FolderBlob(path);
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
                this.blobsSet.set(path, blob);
                this.container.addChild(blob.area);
                blob.updateGraphics(this.graph.renderer.scale);
            }
        }
    }

    removeFolder(path: string): void {
        this.blobsSet.get(path)?.clearGraphics();
        this.blobsSet.delete(path);
    }

    // ============================ UPDATE GRAPHICS ============================

    updateGraphics() {
        for (const [path, blob] of this.blobsSet) {
            blob.updateGraphics(this.graph.renderer.scale);
        }
    }
}