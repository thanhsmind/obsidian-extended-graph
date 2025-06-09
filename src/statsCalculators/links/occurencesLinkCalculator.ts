import { LinkStatCalculator } from "src/internal";
import { Attributes, EdgeEntry } from "graphology-types";

export class OccurencesLinkCalculator extends LinkStatCalculator {
    override async getStat(link: EdgeEntry<Attributes, Attributes>): Promise<number> {
        if (this.statFunction === 'default') return 1;

        return link.attributes['count'];
    }
}