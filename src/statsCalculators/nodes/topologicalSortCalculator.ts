import { GraphologyGraph } from "../graphology";
import { NodeStatCalculator, PluginInstances } from "src/internal";
import { stronglyConnectedComponents } from "graphology-components";
import { DirectedGraph } from "graphology";
import { topologicalSort } from "graphology-dag";
import { reverse } from "graphology-operators";

export class TopologicalSortCalculator extends NodeStatCalculator {
    topologicalWeights: Map<string, number> = new Map<string, number>();

    override async getStats(invert: boolean): Promise<void> {
        if (!this.graphologyGraph) return;
        const graphology = this.graphologyGraph.graphology;
        if (!graphology) return;
        const g = invert ? reverse(graphology) : graphology;
        const components = stronglyConnectedComponents(g);
        const condensedGraph = new DirectedGraph();
        for (const [i, component] of components.entries()) {
            const neighbors: number[] = [];
            for (const node of component) {
                const neighborsOfNode = g.outNeighbors(node);
                const neighborIndexes = neighborsOfNode.map(neighbor => components.findIndex(scc => scc.includes(neighbor))).filter(index => index !== -1 && index !== i);
                neighbors.push(...neighborIndexes);
            }
            //const neighbors = component.map(node => g.outNeighbors(node).map(neighbor => components.findIndex(scc => scc.includes(neighbor)))).flat();
            condensedGraph.addNode(i.toString());
            for (const neighbor of new Set(neighbors)) {
                condensedGraph.addEdge(i.toString(), neighbor.toString());
            }
        }

        const sort = topologicalSort(condensedGraph);

        for (const sccIndex of sort) {
            const scc = components[parseInt(sccIndex)];
            // Propagate the weights of the nodes by incrementing based on incoming edges
            let weight = 0;
            for (const node of scc) {
                const neighbors = g.inNeighbors(node); // all in neighbors have already been visited
                for (const neighbor of neighbors) {
                    if (neighbor !== node) {
                        weight += this.topologicalWeights.get(neighbor) || 0; // add the weight of the neighbor
                    }
                }
            }
            weight += 1; // add the node itself
            for (const node of scc) {
                this.topologicalWeights.set(node, weight);
            }
        }

        return super.getStats(invert);
    }

    override async getStat(id: string, invert: boolean): Promise<number> {
        return this.topologicalWeights.get(id) || 1;
    }

    override getLink(): string {
        return "https://en.wikipedia.org/wiki/Topological_sorting";
    }
}