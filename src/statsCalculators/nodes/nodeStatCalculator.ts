import { TFile } from "obsidian";
import { getColor, PluginInstances, rgb2int } from "src/internal";
import STRINGS from "src/Strings";

export type NodeStatFunction = 'default' | 'backlinksCount' | 'forwardlinksCount' | 'forwardUniquelinksCount' | 'filenameLength' | 'tagsCount' | 'creationTime' | 'modifiedTime' | 'betweenness' | 'closeness' | 'eccentricity' | 'degree' | 'eigenvector' | 'hub' | 'authority';

export const nodeStatFunctionLabels: Record<NodeStatFunction, string> = {
    'default': STRINGS.plugin.default,
    'backlinksCount': STRINGS.statsFunctions.backlinksCount,
    'forwardlinksCount': STRINGS.statsFunctions.forwardlinksCount,
    'forwardUniquelinksCount': STRINGS.statsFunctions.forwardUniquelinksCount,
    'filenameLength': STRINGS.statsFunctions.filenameLength,
    'tagsCount': STRINGS.statsFunctions.tagsCount,
    'creationTime': STRINGS.statsFunctions.creationTime,
    'modifiedTime': STRINGS.statsFunctions.modifiedTime,
    'eccentricity': STRINGS.statsFunctions.eccentricity,
    'betweenness': STRINGS.statsFunctions.betweenness,
    'closeness': STRINGS.statsFunctions.closeness,
    'degree': STRINGS.statsFunctions.degree,
    'eigenvector': STRINGS.statsFunctions.eigenvector,
    'hub': STRINGS.statsFunctions.hub,
    'authority': STRINGS.statsFunctions.authority,
}

export type NodeStat = 'size' | 'color';

export abstract class NodeStatCalculator {
    filesStats: Map<string, number>;
    stat: NodeStat;

    constructor(stat: NodeStat) {
        this.stat = stat;
    }

    async computeStats(): Promise<void> {
        await this.getStats();
        this.mapStat();
    }

    private async getStats(): Promise<void> {
        this.filesStats = new Map<string, number>();
        const files = PluginInstances.app.vault.getMarkdownFiles();
        for (const file of files) {
            this.getStat(file).then(size => this.filesStats.set(file.path, size));
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
                this.filesStats.forEach((size: number, path: string) => {
                    this.filesStats.set(path, rgb2int(getColor(PluginInstances.settings.nodesColorColormap, size / 100)));
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
        this.filesStats.forEach((size: number, path: string) => {
            this.filesStats.set(path, (to - from) * (size - min) / (max - min) + from);
        });
    }

    private getNumberValues(): number[] {
        return [...this.filesStats.values()].filter(n => isFinite(n) && !isNaN(n));
    }

    private cleanNanAndInfinite(defaultValue: number) {
        this.filesStats.forEach((size: number, path: string) => {
            if (!isFinite(size) || isNaN(size)) {
                this.filesStats.set(path, defaultValue);
            }
        });
    }

    abstract getStat(file: TFile): Promise<number>;

    getWarning(): string { return ""; }
    getLink(): string { return ""; }
}