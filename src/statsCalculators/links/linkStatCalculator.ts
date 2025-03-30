import { getColor, GraphologyGraphAnalysis, PluginInstances, rgb2int } from "src/internal";
import STRINGS from "src/Strings";
import { Attributes, EdgeEntry } from "graphology-types";

export type LinkStatFunction = 'default' | 'Adamic Adar' | 'BoW' | 'Clustering Coefficient' | 'Jaccard' | 'Otsuka-Ochiai' | 'Overlap' | 'Sentiment' | 'Co-Citations';

export const linkStatFunctionLabels: Record<LinkStatFunction, string> = {
    'default': STRINGS.plugin.default,
    'Adamic Adar': STRINGS.statsFunctions.AdamicAdar,
    'BoW': STRINGS.statsFunctions.BoW,
    'Co-Citations': STRINGS.statsFunctions.coCitations,
    'Clustering Coefficient': STRINGS.statsFunctions.clusteringCoefficient,
    'Jaccard': STRINGS.statsFunctions.Jaccard,
    'Otsuka-Ochiai': STRINGS.statsFunctions.OtsukaOchiai,
    'Overlap': STRINGS.statsFunctions.overlap,
    'Sentiment': STRINGS.statsFunctions.sentiment,
};

export const linkStatFunctionNeedsNLP: Record<LinkStatFunction, boolean> = {
    'default': false,
    'Adamic Adar': false,
    'BoW': true,
    'Co-Citations': false,
    'Clustering Coefficient': false,
    'Jaccard': false,
    'Otsuka-Ochiai': true,
    'Overlap': false,
    'Sentiment': true,
};

export type LinkStat = 'size' | 'color';

export class LinkStatCalculator {
    linksStats: { [source: string]: { [target: string]: { measure: number, value: number } } };
    stat: LinkStat;
    statFunction: LinkStatFunction;
    g: GraphologyGraphAnalysis;

    constructor(stat: LinkStat, g: GraphologyGraphAnalysis) {
        this.stat = stat;
        this.g = g;
    }

    async computeStats(statFunction: LinkStatFunction): Promise<void> {
        this.statFunction = statFunction;
        await this.getStats();
        this.mapStat();
    }

    private async getStats(): Promise<void> {
        this.linksStats = {};
        const links = this.g.edgeEntries();
        for (const link of links) {
            if (!this.linksStats[link.source]) {
                this.linksStats[link.source] = {};
            }
            this.linksStats[link.source][link.target] = {
                measure: await this.getStat(link),
                value: 0
            }
        }
    }

    async getStat(link: EdgeEntry<Attributes, Attributes>): Promise<number> {
        if (this.statFunction === 'default') return 1;
        try {
            const measure = (await this.g.algs[this.statFunction](link.source))[link.target].measure;
            return measure;
        }
        catch {
            return NaN;
        }
    }

    mapStat(): void {
        switch (this.stat) {
            case 'size':
                this.normalizeValues(0.5, 1.5);
                this.cleanNanAndInfiniteValues(1);
                break;

            case 'color':
                this.normalizeValues(0, 100);
                this.cleanNanAndInfiniteValues(50);
                Object.entries(this.linksStats).forEach(([source, targets]) => {
                    Object.entries(targets).forEach(([target, { measure, value }]) => {
                        this.linksStats[source][target].value = rgb2int(getColor(PluginInstances.settings.linksColorColormap, value / 100));
                    })
                });
                break;

            default:
                break;
        }
    }

    private normalizeValues(from: number, to: number): void {
        const N = this.getMeasures();
        const min = Math.min(...N);
        const max = Math.max(...N);
        Object.entries(this.linksStats).forEach(([source, targets]) => {
            Object.entries(targets).forEach(([target, { measure, value }]) => {
                this.linksStats[source][target].value = (to - from) * (measure - min) / (max - min) + from;
            })
        });
    }

    private getMeasures(): number[] {
        let N: number[] = [];
        Object.entries(this.linksStats).forEach(([source, targets]) => {
            N = N.concat(Object.values(targets).map(({ measure, value }) => measure));
        });
        return N.filter(n => isFinite(n) && !isNaN(n));
    }

    private cleanNanAndInfiniteValues(defaultValue: number) {
        Object.entries(this.linksStats).forEach(([source, targets]) => {
            Object.entries(targets).forEach(([target, { measure, value }]) => {
                if (!isFinite(value) || isNaN(value)) {
                    this.linksStats[source][target].value = defaultValue;
                }
            })
        });
    }

    getWarning(): string { return ""; }
    getLink(): string { return ""; }
}