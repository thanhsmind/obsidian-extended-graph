import { Attributes } from "graphology-types";
import { getFile, GraphologyGraph, NodeStat, NodeStatCalculator, PluginInstances } from "src/internal";

export class ForwardlinkCountCalculator extends NodeStatCalculator {
    countDuplicates: boolean;

    constructor(stat: NodeStat, countDuplicates: boolean, graphologyGraph?: GraphologyGraph) {
        super(stat, countDuplicates ? "forwardlinksCount" : "forwardUniquelinksCount", graphologyGraph);
        this.countDuplicates = countDuplicates;
    }

    override async getStat(id: string, invert: boolean): Promise<number> {
        if (this.graphologyGraph?.graphology) {
            if (this.countDuplicates) {
                return invert
                    ? this.graphologyGraph.graphology.reduceInEdges(id, (acc: number, edge: string, attr: Attributes) => {
                        return acc + (attr["count"] ?? 0);
                    }, 0)
                    : this.graphologyGraph.graphology.reduceOutEdges(id, (acc: number, edge: string, attr: Attributes) => {
                        return acc + (attr["count"] ?? 0);
                    }, 0);
            }
            else {
                return invert ? this.graphologyGraph.graphology.inDegree(id) : this.graphologyGraph.graphology.outDegree(id);
            }
        }

        const file = getFile(id);
        if (file) {
            if (!invert) {
                const links = PluginInstances.app.metadataCache.resolvedLinks[file.path];
                if (!links) {
                    return 0;
                }
                if (this.countDuplicates) {
                    return Object.values(links).reduce((a: number, b: number, i: number, arr: number[]) => a + b, 0);
                }
                return Object.keys(links).length;
            }
            else {
                const backlinks = PluginInstances.app.metadataCache.getBacklinksForFile(file);
                return backlinks.count();
            }
        }
        else {
            if (!invert) {
                // 0 forward links for unresolved nodes
                return 0;
            }
            else {
                let count = 0;
                Object.entries(PluginInstances.app.metadataCache.unresolvedLinks).forEach(([source, unresolvedLinks]) => {
                    if (id in unresolvedLinks) {
                        count += this.countDuplicates ? unresolvedLinks[id] : 1;
                    }
                });
                return count;
            }
        }
    }
}