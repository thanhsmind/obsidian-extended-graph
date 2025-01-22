
import { Graph } from "../graph/graph";
import { getSVGNode } from "src/helperFunctions";
import { ExtendedGraphNode } from "../graph/extendedElements/extendedGraphNode";
import { int2hex, rgb2hex } from "src/colors/colors";
import { ExtendedGraphLink, getLinkID } from "../graph/extendedElements/extendedGraphLink";
import { App, HexString } from "obsidian";
import { GraphEngine, GraphLink, GraphNode, GraphRenderer } from "obsidian-typings";
import { ExportSVGOptionModal, ExportSVGOptions } from "./exportSVGOptionsModal";
import { NodeShape } from "src/graph/graphicElements/nodes/shapes";

export abstract class ExportGraphToSVG {
    app: App;
    svg: SVGSVGElement;
    
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;

    constructor(app: App) {
        this.app = app;
    }

    protected createSVG(options: ExportSVGOptions) {
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        
        this.svg.setAttributeNS(null, 'viewBox', this.getViewBox());

        this.addLinks(options);
        this.addNodes(options);
    }

    private addNodes(options: ExportSVGOptions): void {
        const groupNodes = getSVGNode('g', {id: 'nodes'});

        const visibleNodes = this.getVisibleNodes();
        for (const extendedNode of visibleNodes) {
            const group = getSVGNode('g', {id: extendedNode.id});

            const shape = this.getSVGForNode(extendedNode, options);
            group.appendChild(shape);

            const text = this.getSVGForText(extendedNode, options);
            if (text) group.appendChild(text);

            groupNodes.append(group);
        }

        this.svg.appendChild(groupNodes);
    }

    private addLinks(options: ExportSVGOptions): void {
        const group = getSVGNode('g', {id: 'links'});

        const visibleLinks = this.getVisibleLinks();
        for (const extendedLink of visibleLinks) {
            group.appendChild(this.getSVGForLink(extendedLink, options));
        }

        this.svg.appendChild(group);
    }

    private getSVGForText(node: ExtendedGraphNode | GraphNode, options: ExportSVGOptions): SVGElement | null {
        if (!options.showNodeNames) return null;

        const coreNode = this.getCoreNode(node);

        const text = getSVGNode('text', {
            x: coreNode.circle.x,
            y: coreNode.circle.y + coreNode.getSize() + 20 + 4,
            style: "font-size: 20px;",
            'text-anchor': "middle"
        });
        text.textContent = coreNode.getDisplayText();

        return text;
    }

    private getViewBox(): string {
        this.minX = Infinity;
        this.maxX = -Infinity;
        this.minY = Infinity;
        this.maxY = -Infinity;

        const visibleNodes = this.getVisibleNodes();
        for (const node of visibleNodes) {
            const coreNode = this.getCoreNode(node);
            const rect = coreNode.circle.getBounds();
            if (rect.left < this.minX) this.minX = rect.left;
            if (rect.right > this.maxX) this.maxX = rect.right;
            if (rect.top < this.minY) this.minY = rect.top;
            if (rect.bottom > this.maxY) this.maxY = rect.bottom;
        }

        return `${this.minX} ${this.minY} ${this.maxX - this.minX} ${this.maxY - this.minY}`;
    }

    private getCoreNode(node: ExtendedGraphNode | GraphNode): GraphNode {
        return ('coreElement' in node) ? node.coreElement : node;
    }

    async toClipboard(): Promise<void> {
        try {
            if (ClipboardItem.supports("image/svg+xml")) {
                const modal: ExportSVGOptionModal = this.getModal();

                modal.onClose = (async function() {
                    if (modal.isCanceled) return;

                    // Create SVG
                    this.createSVG(modal.options);

                    // Copy SVG
                    const blob = new Blob([this.toString()], {type: "image/svg+xml"});
                    console.log(this.toString());
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            "image/svg+xml": blob
                        }),
                    ]);
                    new Notice("SVG copied to clipboard");
                }).bind(this);
                
                modal.open();
                
            } else {
                new Notice("SVG images are not supported by the clipboard.");
            }
        } catch (err) {
            console.error(err.name, err.message);
        }
    }

    private toString(): string {
        const s = new XMLSerializer();
        return s.serializeToString(this.svg);
    }

    protected abstract getSVGForNode(node: ExtendedGraphNode | GraphNode, options: ExportSVGOptions): SVGElement;
    protected abstract getSVGForLink(link: ExtendedGraphLink | GraphLink, options: ExportSVGOptions): SVGElement;
    protected abstract getVisibleLinks(): ExtendedGraphLink[] | GraphLink[];
    protected abstract getVisibleNodes(): ExtendedGraphNode[] | GraphNode[];
    protected abstract getModal(): ExportSVGOptionModal;
}

export class ExportExtendedGraphToSVG extends ExportGraphToSVG {
    graph: Graph;

    constructor(app: App, graph: Graph) {
        super(app);
        this.graph = graph;
    }

    protected override getSVGForNode(extendedNode: ExtendedGraphNode, options: ExportSVGOptions): SVGElement {
        const node = extendedNode.coreElement;

        if (options.useNodesShapes && extendedNode.graphicsWrapper) {
            const g = getSVGNode('g', {
                transform: `translate(${node.circle.x - node.getSize()} ${node.circle.y - node.getSize()}) scale(${node.getSize() / NodeShape.RADIUS})`,
                fill: int2hex(node.getFillColor().rgb)
            });
            const shape = NodeShape.getInnerSVG(extendedNode.graphicsWrapper?.shape);
            g.appendChild(shape);
            return g;
        }
        else {
            const circle = getSVGNode('circle', {
                cx: node.circle.x,
                cy: node.circle.y,
                r: node.getSize(),
                fill: int2hex(node.getFillColor().rgb)
            });
            return circle;
        }
    }

    protected override getSVGForLink(extendedLink: ExtendedGraphLink, options: ExportSVGOptions): SVGElement {
        const link = extendedLink.coreElement;

        console.log(getLinkID(link), link);

        let path: string;
        if (options.useCurvedLinks) {
            const P0 = { x: link.source.x, y: link.source.y };
            const P2 = { x: link.target.x, y: link.target.y };
            const N = {x: -(P2.y - P0.y), y: (P2.x - P0.x)};
            const M = {x: (P2.x + P0.x) * 0.5, y: (P2.y + P0.y) * 0.5};
            const P1 = { x: M.x + 0.25 * N.x, y: M.y + 0.25 * N.y };

            path = `M ${P0.x} ${P0.y} C ${P1.x} ${P1.y}, ${P2.x} ${P2.y}, ${P2.x} ${P2.y}`;
        }
        else {
            path = `M ${link.source.circle.x} ${link.source.circle.y} L ${link.target.circle.x} ${link.target.circle.y}`;
        }
        const color: HexString = extendedLink.graphicsWrapper ? rgb2hex(extendedLink.graphicsWrapper.pixiElement.color) : int2hex(Number(link.line.tint));
        const width: number = (this.graph.engine.options.lineSizeMultiplier ?? 1) * 4;
        const opacity: number = extendedLink.graphicsWrapper ? extendedLink.graphicsWrapper.pixiElement.targetAlpha : link.line.alpha;
        const line = getSVGNode('path', {
            d: path,
            stroke: color,
            'stroke-width': width,
            opacity: opacity,
            fill: 'none',
        });

        return line;
    }

    protected override getVisibleNodes(): ExtendedGraphNode[] {
        return [...this.graph.nodesSet.extendedElementsMap.values()].filter(n => this.graph.nodesSet.connectedIDs.has(n.id) && n.coreElement.rendered);
    }

    protected override getVisibleLinks(): ExtendedGraphLink[] {
        return [...this.graph.linksSet.extendedElementsMap.values()]
            .filter(l => this.graph.linksSet.connectedIDs.has(l.id) && l.coreElement.rendered && l.coreElement.line.visible)
            .map(l => l as ExtendedGraphLink);
    }

    private createImageName(): string {
        const viewName = this.graph.dispatcher.graphsManager.plugin.getViewDataById(this.graph.dispatcher.viewsUI.currentViewID);
        const timestamp = window.moment().format("YYYYMMDDHHmmss");
        return `graph${viewName ? '-' + viewName : ''}-${timestamp}.svg`;
    }

    protected getModal(): ExportSVGOptionModal {
        return new ExportSVGOptionModal(this.app, this.graph);
    }
}

export class ExportCoreGraphToSVG extends ExportGraphToSVG {
    engine: GraphEngine;

    constructor(app: App, engine: GraphEngine) {
        super(app);
        this.engine = engine;
    }

    protected override getSVGForNode(node: GraphNode): SVGElement {;
        const circle = getSVGNode('circle', {
            cx: node.circle.x,
            cy: node.circle.y,
            r: node.getSize(),
            fill: int2hex(node.getFillColor().rgb)
        });

        return circle;
    }

    protected override getSVGForLink(link: GraphLink): SVGElement {
        const path: string = `M ${link.source.circle.x} ${link.source.circle.y} L ${link.target.circle.x} ${link.target.circle.y}`;
        const color: HexString = int2hex(Number(link.line.tint));
        const width: number = (this.engine.options.lineSizeMultiplier ?? 1) * 4;
        const opacity: number = link.line.alpha;
        const line = getSVGNode('path', {d: path, stroke: color, 'stroke-width': width, opacity: opacity});

        return line;
    }

    protected override getVisibleNodes(): GraphNode[] {
        return this.engine.renderer.nodes.filter(n => n.rendered);;
    }

    protected override getVisibleLinks(): GraphLink[] {
        return this.engine.renderer.links.filter(l => l.rendered && l.line.visible);
    }

    protected getModal(): ExportSVGOptionModal {
        return new ExportSVGOptionModal(this.app);
    }
}