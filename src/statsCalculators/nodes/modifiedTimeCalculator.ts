import { getFile, GraphologyGraph, NodeStat, NodeStatCalculator, t } from "src/internal";

export class ModifiedTimeCalculator extends NodeStatCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "modifiedTime", graphologyGraph);
    }

    override async getStat(id: string, invert: boolean): Promise<number> {
        return getFile(id)?.stat.mtime || NaN;
    }

    static override getWarning(): string {
        return t("statsFunctions.warningUnreliableOS");
    }
}