import { App, TFile } from "obsidian";

export type NodeSizeFunction = 'default' | 'backlinksCount' | 'forwardlinksCount' | 'forwardUniquelinksCount' | 'filenameLength' | 'tagsCount' | 'creationTime' | 'modifiedTime' | 'betweenness' | 'closeness' | 'eccentricity' | 'degree' | 'eigenvector' | 'hub' | 'authority';

export const nodeSizeFunctionLabels: Record<NodeSizeFunction, string> = {
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

export abstract class NodeSizeCalculator {
    app: App;
    fileSizes: Map<string, number>;

    constructor(app: App) {
        this.app = app;
    }

    async computeSizes(): Promise<void> {
        await this.getSizes();
        this.normalize();
        this.cleanNanAndInfinite();
    }

    private async getSizes(): Promise<void> {
        this.fileSizes = new Map<string, number>();
        const files = this.app.vault.getMarkdownFiles();
        for (const file of files) {
            this.getSize(file).then(size => this.fileSizes.set(file.path, size));
        }
    }

    private normalize(): void {
        const N = this.getNumberValues();
        const min = Math.min(...N);
        const max = Math.max(...N);
        this.fileSizes.forEach((size: number, path: string) => {
            this.fileSizes.set(path, (size - min) / (max - min) + 0.5);
        });
    }

    private getNumberValues(): number[] {
        return [...this.fileSizes.values()].filter(n => isFinite(n) && !isNaN(n));
    }

    private cleanNanAndInfinite() {
        this.fileSizes.forEach((size: number, path: string) => {
            if (!isFinite(size) || isNaN(size)) {
                this.fileSizes.set(path, 1);
            }
        });
    }

    abstract getSize(file: TFile): Promise<number>;

    getWarning(): string { return ""; }
    getLink(): string { return ""; }
}