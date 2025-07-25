import eccentricity from "graphology-metrics/node/eccentricity";
import { GraphologyGraph, NodeStat, NodeStatCalculator } from "src/internal";

export class EccentricityCalculator extends NodeStatCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "eccentricity", graphologyGraph);
    }

    override async getStat(id: string, invert: boolean): Promise<number> {
        if (!this.graphologyGraph) return NaN;
        const connectedGraph = this.graphologyGraph.getConnectedGraphology(id, invert);
        if (!connectedGraph) return NaN;
        return eccentricity(connectedGraph, id);
    }

    override getLink(): string {
        return "https://en.wikipedia.org/wiki/Closeness_centrality";
    }
}