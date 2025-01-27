import { TFile } from "obsidian";
import { NodeStatCalculator } from "src/internal";

export class BacklinkCountCalculator extends NodeStatCalculator {

    override async getStat(file: TFile): Promise<number> {
        const backlinks = this.app.metadataCache.getBacklinksForFile(file);
        return backlinks.count();
    }
}