import { TFile } from "obsidian";
import { NodeSizeCalculator } from "src/internal";

export class ModifiedTimeCalculator extends NodeSizeCalculator {

    override async getSize(file: TFile): Promise<number> {
        return  file.stat.mtime;
    }

    override getWarning(): string {
        return "This calculation is unreliable and might vary between OS.";
    }
}