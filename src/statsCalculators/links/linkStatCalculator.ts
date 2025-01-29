import { App } from "obsidian";
import { ExtendedGraphSettings, getColor, GraphologyGraphAnalysis, PluginInstances, rgb2int } from "src/internal";
import STRINGS from "src/Strings";
import { Attributes, EdgeEntry } from "graphology-types";

export type LinkStatFunction = 'default' | 'Adamic Adar' | 'BoW' | 'Clustering Coefficient' | 'Jaccard' | 'Otsuka-Chiai' | 'Overlap' | 'Sentiment' | 'Co-Citations';

export const linkStatFunctionLabels: Record<LinkStatFunction, string> = {
    'default': STRINGS.plugin.default,
    'Adamic Adar': STRINGS.statsFunctions.AdamicAdar,
    'BoW': STRINGS.statsFunctions.BoW,
    'Co-Citations': STRINGS.statsFunctions.coCitations,
    'Clustering Coefficient': STRINGS.statsFunctions.clusteringCoefficient,
    'Jaccard': STRINGS.statsFunctions.Jaccard,
    'Otsuka-Chiai': STRINGS.statsFunctions.OtsukaChiai,
    'Overlap': STRINGS.statsFunctions.overlap,
    'Sentiment': STRINGS.statsFunctions.sentiment,
};

export const linkStatFunctionNeedsNLP: Record<LinkStatFunction, boolean> = {
    'default': false,
    'Adamic Adar': false,
    'BoW': false,
    'Co-Citations': false,
    'Clustering Coefficient': false,
    'Jaccard': false,
    'Otsuka-Chiai': true,
    'Overlap': false,
    'Sentiment': true,
};

export type LinkStat = 'size' | 'color';

export class LinkStatCalculator {
    linksStats: {[source: string]: {[target: string]: number}};
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
        this.linksStats = { };
        const links = this.g.edgeEntries();
        for (const link of links) {
            if (!this.linksStats[link.source]) {
                this.linksStats[link.source] = {};
            }
            this.linksStats[link.source][link.target] = await this.getStat(link);
        }
    }

    async getStat(link: EdgeEntry<Attributes, Attributes>): Promise<number> {
        if (this.statFunction === 'default') return 1;
        try {
            const measure = (await this.g.algs[this.statFunction](link.source))[link.target].measure
            return measure;
        }
        catch {
            return NaN;
        }
    }

    private mapStat(): void {
        switch (this.stat) {
            case 'size':
                this.normalize(0.5, 1.5);
                this.cleanNanAndInfinite(1);
                break;

            case 'color':
                this.normalize(0, 100);
                this.cleanNanAndInfinite(50);
                Object.entries(this.linksStats).forEach(([source, targets]) => {
                    Object.entries(targets).forEach(([target, size]) => {
                        this.linksStats[source][target] = rgb2int(getColor(PluginInstances.settings.nodesColorColormap, size / 100));
                    })
                });
                break;
        
            default:
                break;
        }
    }

    private normalize(from: number, to: number): void {
        const N = this.getNumberValues();
        const min = Math.min(...N);
        const max = Math.max(...N);
        Object.entries(this.linksStats).forEach(([source, targets]) => {
            Object.entries(targets).forEach(([target, size]) => {
                this.linksStats[source][target] = (to - from) * (size - min) / (max - min) + from;
            })
        });
    }

    private getNumberValues(): number[] {
        let N: number[] = [];
        Object.entries(this.linksStats).forEach(([source, targets]) => {
            N = N.concat(Object.values(targets));
        });
        return N.filter(n => isFinite(n) && !isNaN(n));
    }

    private cleanNanAndInfinite(defaultValue: number) {
        Object.entries(this.linksStats).forEach(([source, targets]) => {
            Object.entries(targets).forEach(([target, size]) => {
                if (!isFinite(size) || isNaN(size)) {
                    this.linksStats[source][target] = defaultValue;
                }
            })
        });
    }

    getWarning(): string { return ""; }
    getLink(): string { return ""; }
}