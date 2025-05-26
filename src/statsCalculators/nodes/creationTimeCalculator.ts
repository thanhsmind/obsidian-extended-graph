import { getFile, NodeStatCalculator } from "src/internal";
import STRINGS from "src/Strings";

export class CreationTimeCalculator extends NodeStatCalculator {

    override async getStat(id: string, invert: boolean): Promise<number> {
        return getFile(id)?.stat.ctime || NaN;
    }

    override getWarning(): string {
        return STRINGS.statsFunctions.warningUnreliableOS;
    }
}