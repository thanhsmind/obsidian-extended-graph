import { evaluateCMap, GraphologyGraph, PluginInstances, t } from "src/internal";
import { Attributes, EdgeEntry } from "graphology-types";

export type LinkStatFunction = 'default' | 'Ocurences' | 'Adamic Adar' | 'BoW' | 'Clustering Coefficient' | 'Jaccard' | 'Otsuka-Ochiai' | 'Overlap' | 'Sentiment' | 'Co-Citations';

export const linkStatFunctionLabels: Record<LinkStatFunction, string> = {
    'default': t("plugin.default"),
    'Adamic Adar': t("statsFunctions.AdamicAdar"),
    'BoW': t("statsFunctions.BoW"),
    'Co-Citations': t("statsFunctions.coCitations"),
    'Clustering Coefficient': t("statsFunctions.clusteringCoefficient"),
    'Jaccard': t("statsFunctions.Jaccard"),
    'Ocurences': t("statsFunctions.Occurences"),
    'Otsuka-Ochiai': t("statsFunctions.OtsukaOchiai"),
    'Overlap': t("statsFunctions.overlap"),
    'Sentiment': t("statsFunctions.sentiment"),
};

export const linkStatFunctionNeedsGraphAnalysis: Record<LinkStatFunction, boolean> = {
    'default': false,
    'Adamic Adar': true,
    'BoW': true,
    'Co-Citations': true,
    'Clustering Coefficient': true,
    'Jaccard': true,
    'Ocurences': false,
    'Otsuka-Ochiai': true,
    'Overlap': true,
    'Sentiment': true,
};

export const linkStatFunctionNeedsNLP: Record<LinkStatFunction, boolean> = {
    'default': false,
    'Adamic Adar': false,
    'BoW': true,
    'Co-Citations': false,
    'Clustering Coefficient': false,
    'Jaccard': false,
    'Ocurences': false,
    'Otsuka-Ochiai': true,
    'Overlap': false,
    'Sentiment': true,
};

export type LinkStat = 'size' | 'color';

export abstract class LinkStatCalculator {
    linksStats: { [source: string]: { [target: string]: { measure: number, value: number } } };
    stat: LinkStat;
    statFunction: LinkStatFunction;

    constructor(stat: LinkStat) {
        this.stat = stat;
    }

    async computeStats(statFunction: LinkStatFunction): Promise<void> {
        this.statFunction = statFunction;
        if (!PluginInstances.graphologyGraph) {
            PluginInstances.graphologyGraph = new GraphologyGraph();
        }
        PluginInstances.graphologyGraph.registerListener(async (graph) => {
            await this.getStats();
            this.mapStat();
        }, true);
    }

    private async getStats(): Promise<void> {
        if (!PluginInstances.graphologyGraph) return;
        this.linksStats = {};
        const links = PluginInstances.graphologyGraph.graphology?.edgeEntries();
        if (!links) return;
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

    abstract getStat(link: EdgeEntry<Attributes, Attributes>): Promise<number>;

    mapStat(): void {
        switch (this.stat) {
            case 'size':
                this.normalizeValues(0.3, 2);
                this.cleanNanAndInfiniteValues(1);
                break;

            case 'color':
                this.normalizeValues(0, 100);
                this.cleanNanAndInfiniteValues(50);
                Object.entries(this.linksStats).forEach(([source, targets]) => {
                    Object.entries(targets).forEach(([target, { measure, value }]) => {
                        this.linksStats[source][target].value = evaluateCMap(value / 100, PluginInstances.settings.linksColorColormap, PluginInstances.settings);
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