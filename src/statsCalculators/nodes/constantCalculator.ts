import { GraphologyGraph, NodeStat, NodeStatCalculator } from "src/internal";

export class ConstantCalculator extends NodeStatCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "constant", graphologyGraph);
    }

    override async getStat(id: string, invert: boolean): Promise<number> {
        return 1;
    }
}