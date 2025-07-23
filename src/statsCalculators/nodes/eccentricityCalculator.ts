import eccentricity from "graphology-metrics/node/eccentricity";
import { NodeStatCalculator, PluginInstances } from "src/internal";

export class EccentricityCalculator extends NodeStatCalculator {

    override async getStat(id: string, invert: boolean): Promise<number> {
        if (!PluginInstances.graphologyGraph) return NaN;
        const connectedGraph = PluginInstances.graphologyGraph.getConnectedGraphology(id, invert);
        if (!connectedGraph) return NaN;
        return eccentricity(connectedGraph, id);
    }

    override getLink(): string {
        return "https://en.wikipedia.org/wiki/Closeness_centrality";
    }
}