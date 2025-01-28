import { TFile } from "obsidian";
import { NodeStatCalculator } from "src/internal";

export class FilenameLengthCalculator extends NodeStatCalculator {

    override async getStat(file: TFile): Promise<number> {
        return file.basename.length;
    }
}