import Graphology from 'graphology';
import { TFile } from "obsidian";
import { dfsFromNode } from "graphology-traversal/dfs";
import { getFile, PluginInstances } from 'src/internal';
import { reverse } from 'graphology-operators';

export class GraphologySingleton {
    static _instance: GraphologySingleton;

    graphologyGraph: Graphology;
    graphologyConnectedGraphs = new Map<string, Graphology>();

    private constructor() {
        this.graphologyGraph = new Graphology();

        // Add existing files
        const files = PluginInstances.app.vault.getFiles();
        for (const file of files) {
            this.graphologyGraph.addNode(file.path);
        }

        // Add unresolved links
        const resolvedLinks = PluginInstances.app.metadataCache.resolvedLinks;
        for (const [source, references] of Object.entries(resolvedLinks)) {
            for (const [target, count] of Object.entries(references)) {
                this.graphologyGraph.addEdge(source, target, { count: count });
            }
        }

        // Add unresolved links and files
        const unresolvedLinks = PluginInstances.app.metadataCache.unresolvedLinks;
        for (const [source, references] of Object.entries(unresolvedLinks)) {
            for (const [target, count] of Object.entries(references)) {
                if (!this.graphologyGraph.hasNode(target)) this.graphologyGraph.addNode(target);
                this.graphologyGraph.addEdge(source, target, { count: count });
            }
        }
    }

    static getInstance(): GraphologySingleton {
        if (!GraphologySingleton._instance) GraphologySingleton._instance = new GraphologySingleton();
        return GraphologySingleton._instance;
    }

    static getGraphology(): Graphology {
        return GraphologySingleton.getInstance().graphologyGraph;
    }

    static getConnectedGraphology(node: string, invert: boolean) {
        const instance = GraphologySingleton.getInstance();

        const addNeighbors = function (originalGraph: Graphology, subGraph: Graphology, node: string) {
            const neighbors = originalGraph.neighbors(node);
            if (!subGraph.hasNode(node)) subGraph.addNode(node);
            for (const target of neighbors) {
                if (!subGraph.hasNode(target)) subGraph.addNode(target);
                subGraph.addEdge(node, target);
            }
        }

        const graph = new Graphology();
        dfsFromNode(instance.graphologyGraph, node, (function (node: string, attr: string, depth: number) {
            if (graph) addNeighbors(instance.graphologyGraph, graph, node);
        }).bind(this));

        if (invert) {
            return reverse(graph);
        }

        return graph;
    }
}