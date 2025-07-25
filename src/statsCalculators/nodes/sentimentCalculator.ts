/**
 * Code from SkepticMystic
 * https://github.com/SkepticMystic/graph-analysis
 * 
 * Released under the GNU General Public License v3.0
 */

import { getNLPPlugin, NodeStatCalculator } from "src/internal";

export class SentimentCalculator extends NodeStatCalculator {
    cache: { [source: string]: { [target: string]: number } } = {};

    override async getStat(id: string, invert: boolean): Promise<number> {
        const nlp = getNLPPlugin();
        if (!nlp) return NaN;

        const graphologyGraph = this.graphologyGraph;
        const g = graphologyGraph?.graphology;
        if (!g) return NaN;

        const doc = nlp.Docs[id]
        if (!doc) {
            return 0;
        }
        return nlp.getAvgSentimentFromDoc(doc)
    }
}