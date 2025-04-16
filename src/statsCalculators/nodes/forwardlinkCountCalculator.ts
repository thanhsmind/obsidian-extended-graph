import { TFile } from "obsidian";
import { NodeStat, NodeStatCalculator, PluginInstances } from "src/internal";

export class ForwardlinkCountCalculator extends NodeStatCalculator {
    countDuplicates: boolean;

    constructor(stat: NodeStat, countDuplicates: boolean) {
        super(stat);
        this.countDuplicates = countDuplicates;
    }

    override async getStat(file: TFile): Promise<number> {
        const links = PluginInstances.app.metadataCache.resolvedLinks[file.path];
        if (this.countDuplicates) {
            return Object.values(links).reduce((a: number, b: number, i: number, arr: number[]) => a + b, 0);
        }
        return Object.keys(links).length;
    }
}