import { App } from "obsidian";
import { BacklinkCountCalculator } from "./backlinkCountCalculator";
import { ForwardlinkCountCalculator } from "./forwardlinkCountCalculator";
import { NodeSizeFunction, NodeSizeCalculator } from "./nodeSizeCalculator";
import { FilenameLengthCalculator } from "./filenameLengthCalculator";
import { TagsCountCalculator } from "./tagsCountCalculator";
import { CreationTimeCalculator } from "./creationTimeCalculator";

export class NodeSizeCalculatorFactory {
    static getCalculator(key: NodeSizeFunction, app: App): NodeSizeCalculator | undefined {
        switch (key) {
            case 'backlinksCount':
                return new BacklinkCountCalculator(app);
            case 'forwardlinksCount':
                return new ForwardlinkCountCalculator(app, true);
            case 'forwardUniquelinksCount':
                return new ForwardlinkCountCalculator(app, false);
            case 'filenameLength':
                return new FilenameLengthCalculator(app);
            case 'tagsCount':
                return new TagsCountCalculator(app);
            case 'creationTime':
                return new CreationTimeCalculator(app);
            default:
                return;
        }
    }
}