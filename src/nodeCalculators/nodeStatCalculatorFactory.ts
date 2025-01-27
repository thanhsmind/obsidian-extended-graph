import { App } from "obsidian";
import { GraphologySingleton } from "./graphology";
import { BacklinkCountCalculator, CreationTimeCalculator, EccentricityCalculator, FilenameLengthCalculator, ForwardlinkCountCalculator, ModifiedTimeCalculator, NodeStatCalculator, NodeStatFunction, TagsCountCalculator } from "src/internal";
import * as centrality from "./centralityCalculator";


export class NodeStatCalculatorFactory {
    static getCalculator(key: NodeStatFunction, app: App): NodeStatCalculator | undefined {
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
            case 'modifiedTime':
                return new ModifiedTimeCalculator(app);
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