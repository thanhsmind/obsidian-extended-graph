import { TFile } from "obsidian";
import { NodeStatCalculator, PluginInstances } from "src/internal";

export class BacklinkCountCalculator extends NodeStatCalculator {

    override async getStat(file: TFile): Promise<number> {
        const backlinks = PluginInstances.app.metadataCache.getBacklinksForFile(file);
        return backlinks.count();
    }
}