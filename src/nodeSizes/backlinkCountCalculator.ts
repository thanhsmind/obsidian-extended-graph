import { TFile } from "obsidian";
import { NodeSizeCalculator } from "src/internal";

export class BacklinkCountCalculator extends NodeSizeCalculator {

    override async getSize(file: TFile): Promise<number> {
        const backlinks = this.app.metadataCache.getBacklinksForFile(file);
        return backlinks.count();
    }
}