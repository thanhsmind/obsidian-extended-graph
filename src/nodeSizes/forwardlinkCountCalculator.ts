import { App, TFile } from "obsidian";
import { NodeSizeCalculator } from "src/internal";

export class ForwardlinkCountCalculator extends NodeSizeCalculator {
    countDuplicates: boolean;

    constructor(app: App, countDuplicates: boolean) {
        super(app);
        this.countDuplicates = countDuplicates;
    }

    override async getSize(file: TFile): Promise<number> {
        const links = this.app.metadataCache.resolvedLinks[file.path];
        if (this.countDuplicates) {
            return Object.values(links).reduce((a: number, b: number, i: number, arr: number[]) => a + b, 0);
        }
        return Object.keys(links).length;
    }
}