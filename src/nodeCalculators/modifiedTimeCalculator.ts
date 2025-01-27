import { TFile } from "obsidian";
import { NodeStatCalculator } from "src/internal";

export class ModifiedTimeCalculator extends NodeStatCalculator {

    override async getStat(file: TFile): Promise<number> {
        return  file.stat.mtime;
    }

    override getWarning(): string {
        return "This calculation is unreliable and might vary between OS.";
    }
}