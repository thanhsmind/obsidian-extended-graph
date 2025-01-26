import { TFile } from "obsidian";
import { getFileInteractives, NodeSizeCalculator, TAG_KEY } from "src/internal";

export class TagsCountCalculator extends NodeSizeCalculator {

    override async getSize(file: TFile): Promise<number> {
        return getFileInteractives(TAG_KEY, this.app, file).size;
    }
}