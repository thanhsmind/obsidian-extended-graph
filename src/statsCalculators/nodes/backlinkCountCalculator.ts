import { Attributes } from "graphology-types";
import { getFile, GraphologyGraph, NodeStat, NodeStatCalculator, PluginInstances } from "src/internal";

export class BacklinkCountCalculator extends NodeStatCalculator {
    countDuplicates: boolean;

    constructor(stat: NodeStat, countDuplicates: boolean, graphologyGraph?: GraphologyGraph) {
        super(stat, "backlinksCount", graphologyGraph);
        this.countDuplicates = countDuplicates;
    }

    override async getStat(id: string, invert: boolean): Promise<number> {
        if (this.graphologyGraph?.graphology) {
            if (this.countDuplicates) {
                return this.graphologyGraph.graphology.reduceInEdges(id, (acc: number, edge: string, attr: Attributes) => {
                    return acc + (attr["count"] ?? 0);
                }, 0);
            }
            else {
                return this.graphologyGraph.graphology.inDegree(id);
            }
        }

        const file = getFile(id);
        if (file) {
            const resolvedCounts = Object.values(PluginInstances.app.metadataCache.resolvedLinks).reduce(
                (acc: number[], value: Record<string, number>) => {
                    if (id in value) {
                        acc.push(value[id]);
                    }
                    return acc;
                },
                []
            );
            const unresolvedCounts = Object.values(PluginInstances.app.metadataCache.unresolvedLinks).reduce(
                (acc: number[], value: Record<string, number>) => {
                    if (id in value) {
                        acc.push(value[id]);
                    }
                    return acc;
                },
                []
            );
            const links = resolvedCounts.concat(unresolvedCounts);
            if (!links) {
                return 0;
            }
            if (this.countDuplicates) {
                return links.reduce((a: number, b: number, i: number, arr: number[]) => a + b, 0);
            }
            return links.length;
        }
        else {
            let count = 0;
            Object.entries(PluginInstances.app.metadataCache.unresolvedLinks).forEach(([source, unresolvedLinks]) => {
                if (id in unresolvedLinks) {
                    count += unresolvedLinks[id];
                }
            });
            return count;
        }
    }
}