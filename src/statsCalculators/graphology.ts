import Graphology from 'graphology';
import { dfsFromNode } from "graphology-traversal/dfs";
import { PluginInstances } from 'src/internal';
import { reverse } from 'graphology-operators';

export class GraphologySingleton {
    static _instance: GraphologySingleton;

    graphologyGraph?: Graphology;
    doneListeners: ((graphologyGraph: Graphology) => any)[] = [];
    graphologyConnectedGraphs = new Map<string, Graphology>();

    private constructor() {
        this.buildGraphology = this.buildGraphology.bind(this);

        if (PluginInstances.app.metadataCache.isCacheClean()) {
            this.buildGraphology();
        }
        else {
            PluginInstances.app.metadataCache.on("resolved", this.buildGraphology);
        }
    }

    private buildGraphology() {
        PluginInstances.app.metadataCache.off("resolved", this.buildGraphology);

        console.log("buildGraphology");

        if (this.graphologyGraph) {
            this.graphologyGraph.clear();
        }
        else {
            this.graphologyGraph = new Graphology();
        }

        // Add existing files
        const files = PluginInstances.app.vault.getFiles();
        for (const file of files) {
            this.graphologyGraph.addNode(file.path);
        }

        // Add unresolved links
        const resolvedLinks = PluginInstances.app.metadataCache.resolvedLinks;
        console.log(Object.keys(resolvedLinks).length);
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

        for (const callback of this.doneListeners) {
            callback(this.graphologyGraph);
        }
    }

    registerListener(callback: (graphologyGraph: Graphology) => any, triggerIfPossible: boolean = false) {
        this.doneListeners.push(callback);
        if (triggerIfPossible && this.graphologyGraph) {
            callback(this.graphologyGraph);
        }
    }

    static getInstance(): GraphologySingleton {
        if (!GraphologySingleton._instance) GraphologySingleton._instance = new GraphologySingleton();
        return GraphologySingleton._instance;
    }

    static getGraphology(): Graphology | undefined {
        return GraphologySingleton.getInstance().graphologyGraph;
    }

    static getConnectedGraphology(node: string, invert: boolean) {
        const graphology = GraphologySingleton.getInstance().graphologyGraph;
        if (!graphology) return;

        const addNeighbors = function (originalGraph: Graphology, subGraph: Graphology, node: string) {
            const neighbors = originalGraph.neighbors(node);
            if (!subGraph.hasNode(node)) subGraph.addNode(node);
            for (const target of neighbors) {
                if (!subGraph.hasNode(target)) subGraph.addNode(target);
                subGraph.addEdge(node, target);
            }
        }

        const graph = new Graphology();
        dfsFromNode(graphology, node, (function (node: string, attr: string, depth: number) {
            if (graph) addNeighbors(graphology, graph, node);
        }).bind(this));

        if (invert) {
            return reverse(graph);
        }

        return graph;
    }
}