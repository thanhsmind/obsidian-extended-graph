import { TFile } from "obsidian";
import { NodeSizeCalculator } from "src/internal";

export class FilenameLengthCalculator extends NodeSizeCalculator {

    override async getSize(file: TFile): Promise<number> {
        return file.basename.length;
    }
}