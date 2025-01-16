import { Component } from "obsidian";
import { Graph } from "./graph";
import { GraphNode } from "obsidian-typings";
import { Container, Ellipse, Graphics, Point, Text, TextStyle } from "pixi.js";
import { complex, Complex, det, diag, inv, matrix, multiply, size, sqrt, subtract, transpose, zeros } from "mathjs";
import { getFile } from "src/helperFunctions";

export class FolderBlob {
    readonly path: string;
    nodes: GraphNode[] = [];
    area: Graphics;
    text: Text;
    textStyle: TextStyle;
    BBox: {xMin: number, xMax: number, yMin: number, yMax: number};

    constructor(path: string) {
        this.path = path;

        this.area = new Graphics();
        this.area.eventMode = 'none';
        
        this.textStyle = new TextStyle({
            fontSize: 14,
            fill: 'yellow',
            fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Microsoft YaHei Light", sans-serif',
            wordWrap: !0,
            wordWrapWidth: 300,
            align: "center"
        });
        this.text = new Text(path, this.textStyle);
        this.text.anchor.set(0.5, 0);
        this.area.addChild(this.text);
    }

    addNode(node: GraphNode) {
        this.nodes.push(node);
    }

    draw() {
        this.computeBox();
        this.drawBox();
    }

    private drawBox() {
        this.area.clear();

        this.area.lineStyle(2, 'red', 0.7)
            .beginFill('red', 0.05)
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

    placeText(scale: number) {
        const t = Math.min(scale, 5);
        this.text.style.fontSize = 14 * t;
        this.text.x = this.BBox.xMin +  0.5 * (this.BBox.xMax - this.BBox.xMin);
        this.text.y = this.BBox.yMin;
        this.text.scale.set(1 / t);
    }
}

export class FolderBlobs extends Component {
    // Parent graph
    readonly graph: Graph;

    // Set of blobs
    blobsSet: Map<string, FolderBlob>;

    // Graphics
    container: Container;

    // ============================== CONSTRUCTOR ==============================

    constructor(graph: Graph) {
        super();

        // Parent graph
        this.graph = graph;

        // Set of blobs
        this.blobsSet = new Map<string, FolderBlob>();
    }

    

    // ================================ LOADING ================================

    onload(): void {
        this.initContainer();
        this.initBlobs();
        this.drawEllipses();
    }

    private initBlobs(): void {
        for (const node of this.graph.renderer.nodes) {
            const file = getFile(this.graph.dispatcher.graphsManager.plugin.app, node.id);
            const folder = file?.parent?.path;
            if (!folder) continue;
            if (!this.blobsSet.has(folder)) {
                this.blobsSet.set(folder, new FolderBlob(folder));
            }
            this.blobsSet.get(folder)?.addNode(node);
        }
    }

    private initContainer(): void {
        this.container = new Container();
        this.container.name = "Blobs";
        (this.graph.renderer.px.stage.children[1] as Container).addChildAt(this.container, 0);
    }

    drawEllipses(): void {
        this.container.removeChildren();
        for (const [path, blob] of this.blobsSet) {
            blob.draw();
            blob.placeText(this.graph.renderer.scale);
            this.container.addChild(blob.area);
        }
    }

    // =============================== UNLOADING ===============================

    unload(): void {
        this.container.destroy({children: true});
        this.container.removeFromParent();
        this.blobsSet.clear();
    }
}