import { TFile } from "obsidian";
import { NodeStatCalculator } from "src/internal";

export class CreationTimeCalculator extends NodeStatCalculator {

    override async getStat(file: TFile): Promise<number> {
        return  file.stat.ctime;
    }

    override getWarning(): string {
        return "This calculation is unreliable and might vary between OS.";
    }
}