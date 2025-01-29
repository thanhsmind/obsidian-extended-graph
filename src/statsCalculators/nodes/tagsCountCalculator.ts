import { TFile } from "obsidian";
import { getFileInteractives, NodeStatCalculator, TAG_KEY } from "src/internal";

export class TagsCountCalculator extends NodeStatCalculator {

    override async getStat(file: TFile): Promise<number> {
        return getFileInteractives(TAG_KEY, file).size;
    }
}