import Graphology from 'graphology';
import { degreeCentrality } from "graphology-metrics/centrality/degree";
import eigenvectorCentrality from "graphology-metrics/centrality/eigenvector";
import closenessCentrality from "graphology-metrics/centrality/closeness";
import betweennessCentrality from "graphology-metrics/centrality/betweenness";
import hits from "graphology-metrics/centrality/hits";
import { GraphologyGraph, NodeStat, NodeStatCalculator, NodeStatFunction, PluginInstances } from "src/internal";
import { reverse } from "graphology-operators";

type CentralityMapping = Record<string, number>;

export abstract class CentralityCalculator extends NodeStatCalculator {
    cm: CentralityMapping;
    link: string;

    constructor(stat: NodeStat, functionKey: NodeStatFunction, graphologyGraph?: GraphologyGraph, link: string = "") {
        super(stat, functionKey, graphologyGraph);
        this.link = link;
    }

    override async computeStats(invert: boolean): Promise<void> {
        if (!this.graphologyGraph) {
            if (!PluginInstances.graphologyGraph) {
                PluginInstances.graphologyGraph = new GraphologyGraph();
            }
            this.graphologyGraph = PluginInstances.graphologyGraph;
        }
        const graphology = this.graphologyGraph.graphology;
        if (!graphology) return;
        this.computeCentralityMap(invert ? reverse(graphology) : graphology);
        return super.computeStats(invert);
    }

    override async getStat(id: string): Promise<number> {
        return this.cm[id];
    }

    protected abstract computeCentralityMap(g: Graphology): void;
    abstract getLink(): string;
}

export class DegreeCentralityCalculator extends CentralityCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "degree", graphologyGraph);
    }

    override computeCentralityMap(g: Graphology) {
        this.cm = degreeCentrality(g);
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/Degree_(graph_theory)";
    }
}

export class EigenvectorCentralityCalculator extends CentralityCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "eigenvector", graphologyGraph);
    }

    override computeCentralityMap(g: Graphology) {
        this.cm = eigenvectorCentrality(g);
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/Eigenvector_centrality";
    }
}

export class ClosenessCentralityCalculator extends CentralityCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "closeness", graphologyGraph);
    }

    override computeCentralityMap(g: Graphology) {
        this.cm = closenessCentrality(g);
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/Closeness_centrality";
    }
}

export class BetweennessCentralityCalculator extends CentralityCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "betweenness", graphologyGraph);
    }

    override computeCentralityMap(g: Graphology) {
        this.cm = betweennessCentrality(g);
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/Betweenness_centrality";
    }
}

export class HubsCalculator extends CentralityCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "hub", graphologyGraph);
    }

    override computeCentralityMap(g: Graphology) {
        const { hubs, authorities } = hits(g);
        this.cm = hubs;
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/HITS_algorithm";
    }
}

export class AuthoritiesCalculator extends CentralityCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "authority", graphologyGraph);
    }

    override computeCentralityMap(g: Graphology) {
        const { hubs, authorities } = hits(g);
        this.cm = authorities;
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/HITS_algorithm";
    }
}