import { App, TFile } from "obsidian";
import { ExtendedGraphSettings, getColor, rgb2int } from "src/internal";

export type NodeStatFunction = 'default' | 'backlinksCount' | 'forwardlinksCount' | 'forwardUniquelinksCount' | 'filenameLength' | 'tagsCount' | 'creationTime' | 'modifiedTime' | 'betweenness' | 'closeness' | 'eccentricity' | 'degree' | 'eigenvector' | 'hub' | 'authority';

export const nodeStatFunctionLabels: Record<NodeStatFunction, string> = {
    'default': "Default",
    'backlinksCount': "Number of backlinks",
    'forwardlinksCount': "Number of forward links",
    'forwardUniquelinksCount': "Number of unique forward links",
    'filenameLength': "File name length",
    'tagsCount': "Number of tags",
    'creationTime': "Time since file creation",
    'modifiedTime': "Time since last modification",
    'eccentricity': "Eccentricity in the connected graph",
    'betweenness': "Betweenness centrality",
    'closeness': "Closeness centrality",
    'degree': "Degree centrality",
    'eigenvector': "Eigenvector centrality",
    'hub': "Hub centrality (from HITS)",
    'authority': "Authority centrality (from HITS)",
}

export type NodeStat = 'size' | 'color';

export abstract class NodeStatCalculator {
    app: App;
    settings: ExtendedGraphSettings
    fileStats: Map<string, number>;
    stat: NodeStat;

    constructor(app: App, settings: ExtendedGraphSettings, stat: NodeStat) {
        this.app = app;
        this.settings = settings;
        this.stat = stat;
    }

    async computeStats(): Promise<void> {
        await this.getStats();
        this.mapStat();
    }

    private async getStats(): Promise<void> {
        this.fileStats = new Map<string, number>();
        const files = this.app.vault.getMarkdownFiles();
        for (const file of files) {
            this.getStat(file).then(size => this.fileStats.set(file.path, size));
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
                this.fileStats.forEach((size: number, path: string) => {
                    this.fileStats.set(path, rgb2int(getColor(this.settings.nodeColorColormap, size / 100)));
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
        this.fileStats.forEach((size: number, path: string) => {
            this.fileStats.set(path, (to - from) * (size - min) / (max - min) + from);
        });
    }

    private getNumberValues(): number[] {
        return [...this.fileStats.values()].filter(n => isFinite(n) && !isNaN(n));
    }

    private cleanNanAndInfinite(defaultValue: number) {
        this.fileStats.forEach((size: number, path: string) => {
            if (!isFinite(size) || isNaN(size)) {
                this.fileStats.set(path, defaultValue);
            }
        });
    }

    abstract getStat(file: TFile): Promise<number>;

    getWarning(): string { return ""; }
    getLink(): string { return ""; }
}