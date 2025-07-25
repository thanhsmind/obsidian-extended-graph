import Graphology from 'graphology';
import { dfsFromNode } from "graphology-traversal/dfs";
import { GraphInstances, linkStatFunctionIsDynamic, nodeStatFunctionIsDynamic, PluginInstances } from 'src/internal';
import { reverse } from 'graphology-operators';
import { undirectedSingleSourceLength } from 'graphology-shortest-path/unweighted';
import { LocalGraphView } from 'obsidian-typings';

export class GraphologyGraph {
    graphology?: Graphology;
    doneListeners: ((graphologyGraph: Graphology) => any)[] = [];
    graphologyConnectedGraphs = new Map<string, Graphology>();
    instances?: GraphInstances;

    constructor(instances?: GraphInstances) {
        this.buildGraphology = this.buildGraphology.bind(this);
        this.instances = instances;

        if (PluginInstances.app.metadataCache.isCacheClean()) {
            this.buildGraphology();
        }
        else {
            PluginInstances.app.metadataCache.on("resolved", this.buildGraphology);
        }
    }

    buildGraphology() {
        PluginInstances.app.metadataCache.off("resolved", this.buildGraphology);

        if (this.graphology) {
            this.graphology.clear();
        }
        else {
            this.graphology = new Graphology();
        }

        if (this.instances) {
            // Add nodes
            for (const node of this.instances.renderer.nodes) {
                this.graphology.addNode(node.id);
            }

            // Add links
            const resolvedLinks = PluginInstances.app.metadataCache.resolvedLinks;
            const unresolvedLinks = PluginInstances.app.metadataCache.unresolvedLinks;
            for (const link of this.instances.renderer.links) {
                let count = 1;

                // Get the number of occurences in the vault
                const resolvedReference = resolvedLinks[link.source.id];
                if (resolvedReference) {
                    count = resolvedReference[link.target.id] ?? count;
                }
                const unresolvedReference = unresolvedLinks[link.source.id];
                if (unresolvedReference) {
                    count += unresolvedReference[link.target.id] ?? 0;
                }

                this.graphology.addEdge(link.source.id, link.target.id, { count: count });
            }
        }

        else {
            // Add existing files
            const files = PluginInstances.app.vault.getFiles();
            for (const file of files) {
                this.graphology.addNode(file.path);
            }

            // Add unresolved links
            const resolvedLinks = PluginInstances.app.metadataCache.resolvedLinks;
            for (const [source, references] of Object.entries(resolvedLinks)) {
                for (const [target, count] of Object.entries(references)) {
                    this.graphology.addEdge(source, target, { count: count });
                }
            }

            // Add unresolved links and files
            const unresolvedLinks = PluginInstances.app.metadataCache.unresolvedLinks;
            for (const [source, references] of Object.entries(unresolvedLinks)) {
                for (const [target, count] of Object.entries(references)) {
                    if (!this.graphology.hasNode(target)) this.graphology.addNode(target);
                    this.graphology.addEdge(source, target, { count: count });
                }
            }
        }

        this.computeAttributes();

        for (const callback of this.doneListeners) {
            callback(this.graphology);
        }
    }

    private computeAttributes() {
        if (!this.graphology || !this.instances) return;

        if (this.instances.type === "localgraph" && this.instances.settings.depthColormap) {
            const mainNode = (this.instances.view as LocalGraphView).file?.path;
            if (mainNode) {
                const paths = undirectedSingleSourceLength(this.graphology, mainNode);
                for (const target in paths) {
                    this.graphology.setNodeAttribute(target, 'depth', paths[target]);
                }
            }
        }

        if (this.instances.settings.enableFeatures[this.instances.type]['elements-stats']) {
            if (linkStatFunctionIsDynamic[this.instances.settings.linksSizeFunction]) {
                PluginInstances.graphsManager.initializeLinksSizeCalculator(this.instances);
            }
            if (linkStatFunctionIsDynamic[this.instances.settings.linksColorFunction]) {
                PluginInstances.graphsManager.initializeLinksColorCalculator(this.instances);
            }
            if (nodeStatFunctionIsDynamic[this.instances.settings.nodesSizeFunction]) {
                PluginInstances.graphsManager.initiliazesNodeSizeCalculator(this.instances);
            }
            if (nodeStatFunctionIsDynamic[this.instances.settings.nodesColorFunction]) {
                PluginInstances.graphsManager.initializeNodesColorCalculator(this.instances);
            }
        }
    }

    registerListener(callback: (graphologyGraph: Graphology) => any, triggerIfPossible: boolean = false) {
        this.doneListeners.push(callback);
        if (triggerIfPossible && this.graphology) {
            callback(this.graphology);
        }
    }

    getGraphology(): Graphology | undefined {
        return this.graphology;
    }

    getConnectedGraphology(node: string, invert: boolean) {
        const graphology = this.graphology;
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

    intersection(nodes1: string[], nodes2: string[]) {
        return nodes1?.filter((node1) => nodes2.includes(node1)) ?? []
    }
}