import { getFile, NodeStatCalculator, t } from "src/internal";

export class CreationTimeCalculator extends NodeStatCalculator {

    override async getStat(id: string, invert: boolean): Promise<number> {
        return getFile(id)?.stat.ctime || NaN;
    }

    override getWarning(): string {
        return t("statsFunctions.warningUnreliableOS");
    }
}