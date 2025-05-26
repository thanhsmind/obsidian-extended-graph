import { getFile, NodeStatCalculator } from "src/internal";
import STRINGS from "src/Strings";

export class ModifiedTimeCalculator extends NodeStatCalculator {

    override async getStat(id: string, invert: boolean): Promise<number> {
        return getFile(id)?.stat.mtime || NaN;
    }

    override getWarning(): string {
        return STRINGS.statsFunctions.warningUnreliableOS;
    }
}