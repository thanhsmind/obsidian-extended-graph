import { TFile } from "obsidian";
import { NodeStatCalculator } from "src/internal";
import STRINGS from "src/Strings";

export class ModifiedTimeCalculator extends NodeStatCalculator {

    override async getStat(file: TFile): Promise<number> {
        return  file.stat.mtime;
    }

    override getWarning(): string {
        return STRINGS.statsFunctions.warningUnreliableOS;
    }
}