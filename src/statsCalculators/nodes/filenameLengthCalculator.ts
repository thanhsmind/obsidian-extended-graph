import { getFile, GraphologyGraph, NodeStat, NodeStatCalculator } from "src/internal";

export class FilenameLengthCalculator extends NodeStatCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "filenameLength", graphologyGraph);
    }

    override async getStat(id: string, invert: boolean): Promise<number> {
        return getFile(id)?.basename.length || id.length;
    }
}