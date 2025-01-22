import { getFile } from "src/helperFunctions";
import Graphology from 'graphology';
import { App, TFile } from "obsidian";
import { dfsFromNode } from "graphology-traversal/dfs";

export class GraphologySingleton {
    static _instance: GraphologySingleton;

    app: App;
    graphologyGraph: Graphology;
    graphologyConnectedGraphs = new Map<string, Graphology>();

    private constructor(app: App) {
        this.app = app;
        this.graphologyGraph = new Graphology();

        const files = this.app.vault.getFiles().filter(file => this.shouldAddFile(file));
        for (const file of files) {
            this.graphologyGraph.addNode(file.path);
        }

        const links = this.app.metadataCache.resolvedLinks;
        for (const [source, references] of Object.entries(links)) {
            const validLinks = Object.keys(references).filter(target => this.shouldAddLink(source, target))
            for (const target of validLinks) {
                this.graphologyGraph.addEdge(source, target);
            }
        }
    }

    private shouldAddFile(file: TFile | null): boolean {
        return !!file && file.extension === "md";
    }

    private shouldAddLink(source: string, target: string) {
        return this.shouldAddFile(getFile(this.app, source)) && this.shouldAddFile(getFile(this.app, target));
    }

    static getInstance(app: App): GraphologySingleton {
        if (!GraphologySingleton._instance) GraphologySingleton._instance = new GraphologySingleton(app);
        return GraphologySingleton._instance;
    }

    static getGraphology(app: App): Graphology {
        return GraphologySingleton.getInstance(app).graphologyGraph;
    }

    static getConnectedGraphology(app: App, node: string) {
        const instance = GraphologySingleton.getInstance(app);
        let graph = instance.graphologyConnectedGraphs.get(node);
        if (graph) {
            return graph;
        }

        const addNeighbors = function(originalGraph: Graphology, subGraph: Graphology, node: string) {
            const neighbors = originalGraph.neighbors(node);
            if (!subGraph.hasNode(node)) subGraph.addNode(node);
            for (const target of neighbors) {
                if (!subGraph.hasNode(target)) subGraph.addNode(target);
                subGraph.addEdge(node, target);
            }
        }

        graph = new Graphology();
        dfsFromNode(instance.graphologyGraph, node, (function (node: string, attr: string, depth: number) {
            addNeighbors(instance.graphologyGraph, graph, node);
        }).bind(this));

        return graph;
    }
}