import { getFile, getFileInteractives, GraphologyGraph, NodeStat, NodeStatCalculator, TAG_KEY } from "src/internal";

export class TagsCountCalculator extends NodeStatCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "tagsCount", graphologyGraph);
    }

    override async getStat(id: string, invert: boolean): Promise<number> {
        const file = getFile(id);
        return file ? getFileInteractives(TAG_KEY, file).size : 0;
    }
}