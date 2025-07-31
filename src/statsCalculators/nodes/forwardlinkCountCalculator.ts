import { Attributes } from "graphology-types";
import { getFile, GraphologyGraph, NodeStat, NodeStatCalculator, PluginInstances } from "src/internal";

export class ForwardlinkCountCalculator extends NodeStatCalculator {
    countDuplicates: boolean;

    constructor(stat: NodeStat, countDuplicates: boolean, graphologyGraph?: GraphologyGraph) {
        super(stat, countDuplicates ? "forwardlinksCount" : "forwardUniquelinksCount", graphologyGraph);
        this.countDuplicates = countDuplicates;
    }

    override async getStat(id: string): Promise<number> {
        if (this.graphologyGraph?.graphology) {
            if (this.countDuplicates) {
                return this.graphologyGraph.graphology.reduceOutEdges(id, (acc: number, edge: string, attr: Attributes) => {
                    return acc + (attr["count"] ?? 0);
                }, 0);
            }
            else {
                return this.graphologyGraph.graphology.outDegree(id);
            }
        }

        const file = getFile(id);
        if (file) {
            const links = Object.fromEntries(Object.entries(PluginInstances.app.metadataCache.resolvedLinks[file.path]).concat(
                Object.entries(PluginInstances.app.metadataCache.unresolvedLinks[file.path])
            ));
            if (!links) {
                return 0;
            }
            if (this.countDuplicates) {
                return Object.values(links).reduce((a: number, b: number, i: number, arr: number[]) => a + b, 0);
            }
            return Object.keys(links).length;
        }
        else {
            // 0 forward links for unresolved nodes
            return 0;
        }
    }
}