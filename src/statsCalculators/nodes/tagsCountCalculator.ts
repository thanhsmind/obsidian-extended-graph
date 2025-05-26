import { getFile, getFileInteractives, NodeStatCalculator, TAG_KEY } from "src/internal";

export class TagsCountCalculator extends NodeStatCalculator {

    override async getStat(id: string, invert: boolean): Promise<number> {
        const file = getFile(id);
        return file ? getFileInteractives(TAG_KEY, file).size : 0;
    }
}