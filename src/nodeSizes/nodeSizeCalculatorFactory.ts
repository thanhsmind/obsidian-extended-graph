import { App } from "obsidian";
import { BacklinkCountCalculator } from "./backlinkCountCalculator";
import { ForwardlinkCountCalculator } from "./forwardlinkCountCalculator";
import { NodeSizeFunction, NodeSizeCalculator } from "./nodeSizeCalculator";
import { FilenameLengthCalculator } from "./filenameLengthCalculator";
import { TagsCountCalculator } from "./tagsCountCalculator";
import { CreationTimeCalculator } from "./creationTimeCalculator";
import { EccentricityCalculator } from "./eccentricityCalculator";
import { GraphologySingleton } from "./graphology";
import * as centrality from "./centralityCalculator";

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
            case 'eccentricity':
                return new EccentricityCalculator(app);
            case 'closeness':
                return new centrality.ClosenessCentralityCalculator(app, GraphologySingleton.getGraphology(app));
            case 'betweenness':
                return new centrality.BetweennessCentralityCalculator(app, GraphologySingleton.getGraphology(app));
            case 'degree':
                return new centrality.DegreeCentralityCalculator(app, GraphologySingleton.getGraphology(app));
            case 'eigenvector':
                return new centrality.EigenvectorCentralityCalculator(app, GraphologySingleton.getGraphology(app));
            case 'hub':
                return new centrality.HubsCalculator(app, GraphologySingleton.getGraphology(app));
            case 'authority':
                return new centrality.AuthoritiesCalculator(app, GraphologySingleton.getGraphology(app));
            default:
                return;
        }
    }
}