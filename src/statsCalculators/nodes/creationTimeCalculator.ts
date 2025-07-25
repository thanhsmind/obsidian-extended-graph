import { getFile, GraphologyGraph, NodeStat, NodeStatCalculator, t } from "src/internal";

export class CreationTimeCalculator extends NodeStatCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "creationTime", graphologyGraph);
    }

    override async getStat(id: string, invert: boolean): Promise<number> {
        return getFile(id)?.stat.ctime || NaN;
    }

    override getWarning(): string {
        return t("statsFunctions.warningUnreliableOS");
    }
}