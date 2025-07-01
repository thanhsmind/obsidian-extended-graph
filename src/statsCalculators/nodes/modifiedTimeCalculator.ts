import { getFile, NodeStatCalculator, t } from "src/internal";

export class ModifiedTimeCalculator extends NodeStatCalculator {

    override async getStat(id: string, invert: boolean): Promise<number> {
        return getFile(id)?.stat.mtime || NaN;
    }

    override getWarning(): string {
        return t("statsFunctions.warningUnreliableOS");
    }
}