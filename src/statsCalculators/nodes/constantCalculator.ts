import { TFile } from "obsidian";
import { NodeStatCalculator } from "src/internal";

export class ConstantCalculator extends NodeStatCalculator {

    override async getStat(file: TFile): Promise<number> {
        return 1;
    }
}