import { NodeStatCalculator } from "src/internal";

export class ConstantCalculator extends NodeStatCalculator {

    override async getStat(id: string, invert: boolean): Promise<number> {
        return 1;
    }
}