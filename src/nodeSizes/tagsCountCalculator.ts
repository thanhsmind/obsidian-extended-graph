import { TFile } from "obsidian";
import { NodeSizeCalculator } from "./nodeSizeCalculator";
import { getFileInteractives } from "src/helperFunctions";
import { TAG_KEY } from "src/globalVariables";

export class TagsCountCalculator extends NodeSizeCalculator {

    override async getSize(file: TFile): Promise<number> {
        return getFileInteractives(TAG_KEY, this.app, file).size;
    }
}