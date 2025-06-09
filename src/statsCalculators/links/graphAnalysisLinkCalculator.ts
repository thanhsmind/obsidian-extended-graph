import { GraphologyGraphAnalysis, LinkStat, LinkStatCalculator } from "src/internal";
import { Attributes, EdgeEntry } from "graphology-types";

export class GraphAnalysisLinkCalculator extends LinkStatCalculator {
    g: GraphologyGraphAnalysis;

    constructor(stat: LinkStat, g: GraphologyGraphAnalysis) {
        super(stat);
        this.g = g;
    }

    override async getStat(link: EdgeEntry<Attributes, Attributes>): Promise<number> {
        if (this.statFunction === 'default') return 1;

        try {
            const measure = (await this.g.algs[this.statFunction](link.source))[link.target].measure;
            return measure;
        }
        catch {
            return NaN;
        }
    }
}