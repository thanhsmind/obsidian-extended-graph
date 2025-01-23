import { TFile } from "obsidian";
import { NodeSizeCalculator } from "./nodeSizeCalculator";

export class CreationTimeCalculator extends NodeSizeCalculator {

    override async getSize(file: TFile): Promise<number> {
        return  file.stat.ctime;
    }

    override getWarning(): string {
        return "This calculation is unreliable and might vary between OS.";
    }
}