import { getFile, NodeStatCalculator } from "src/internal";

export class FilenameLengthCalculator extends NodeStatCalculator {

    override async getStat(id: string, invert: boolean): Promise<number> {
        return getFile(id)?.basename.length || id.length;
    }
}