import { App, TFile } from "obsidian";

export type NodeSizeFunction = 'default' | 'backlinksCount' | 'forwardlinksCount' | 'forwardUniquelinksCount' | 'filenameLength' | 'tagsCount' | 'creationTime';

export const nodeSizeFunctionLabels: Record<NodeSizeFunction, string> = {
    'default': "Default",
    'backlinksCount': "Number of backlinks",
    'forwardlinksCount': "Number of forward links",
    'forwardUniquelinksCount': "Number of unique forward links",
    'filenameLength': "File name length",
    'tagsCount': "Number of tags",
    'creationTime': "Time since file creation"
}

export abstract class NodeSizeCalculator {
    app: App;
    fileSizes: Map<string, number>;

    constructor(app: App) {
        this.app = app;
    }

    async computeSizes(): Promise<void> {
        await this.getSizes()
        this.normalize();
    }

    private async getSizes(): Promise<void> {
        this.fileSizes = new Map<string, number>();
        const files = this.app.vault.getMarkdownFiles();
        for (const file of files) {
            this.getSize(file).then(size => this.fileSizes.set(file.path, size));
        }
    }

    private normalize(): void {
        const min = Math.min(...this.fileSizes.values());
        const max = Math.max(...this.fileSizes.values());
        this.fileSizes.forEach((size: number, path: string) => {
            this.fileSizes.set(path, (size - min) / (max - min) + 0.5);
        })
    }

    abstract getSize(file: TFile): Promise<number>;

    getWarning(): string { return ""; }
}