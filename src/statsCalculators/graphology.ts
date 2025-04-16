import Graphology from 'graphology';
import { TFile } from "obsidian";
import { dfsFromNode } from "graphology-traversal/dfs";
import { getFile, PluginInstances } from 'src/internal';

export class GraphologySingleton {
    static _instance: GraphologySingleton;

    graphologyGraph: Graphology;
    graphologyConnectedGraphs = new Map<string, Graphology>();

    private constructor() {
        this.graphologyGraph = new Graphology();

        const files = PluginInstances.app.vault.getFiles().filter(file => this.shouldAddFile(file));
        for (const file of files) {
            this.graphologyGraph.addNode(file.path);
        }

        const links = PluginInstances.app.metadataCache.resolvedLinks;
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
        return this.shouldAddFile(getFile(source)) && this.shouldAddFile(getFile(target));
    }

    static getInstance(): GraphologySingleton {
        if (!GraphologySingleton._instance) GraphologySingleton._instance = new GraphologySingleton();
        return GraphologySingleton._instance;
    }

    static getGraphology(): Graphology {
        return GraphologySingleton.getInstance().graphologyGraph;
    }

    static getConnectedGraphology(node: string) {
        const instance = GraphologySingleton.getInstance();
        let graph = instance.graphologyConnectedGraphs.get(node);
        if (graph) {
            return graph;
        }

        const addNeighbors = function (originalGraph: Graphology, subGraph: Graphology, node: string) {
            const neighbors = originalGraph.neighbors(node);
            if (!subGraph.hasNode(node)) subGraph.addNode(node);
            for (const target of neighbors) {
                if (!subGraph.hasNode(target)) subGraph.addNode(target);
                subGraph.addEdge(node, target);
            }
        }

        graph = new Graphology();
        dfsFromNode(instance.graphologyGraph, node, (function (node: string, attr: string, depth: number) {
            if (graph) addNeighbors(instance.graphologyGraph, graph, node);
        }).bind(this));

        return graph;
    }
}