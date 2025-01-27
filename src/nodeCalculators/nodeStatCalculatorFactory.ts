import { App } from "obsidian";
import { GraphologySingleton } from "./graphology";
import { BacklinkCountCalculator, CreationTimeCalculator, EccentricityCalculator, ExtendedGraphSettings, FilenameLengthCalculator, ForwardlinkCountCalculator, ModifiedTimeCalculator, NodeStat, NodeStatCalculator, NodeStatFunction, TagsCountCalculator } from "src/internal";
import * as centrality from "./centralityCalculator";


export class NodeStatCalculatorFactory {
    static getCalculator(key: NodeStatFunction, app: App, settings: ExtendedGraphSettings, stat: NodeStat): NodeStatCalculator | undefined {
        switch (key) {
            case 'backlinksCount':
                return new BacklinkCountCalculator(app, settings, stat);
            case 'forwardlinksCount':
                return new ForwardlinkCountCalculator(app, settings, stat, true);
            case 'forwardUniquelinksCount':
                return new ForwardlinkCountCalculator(app, settings, stat, false);
            case 'filenameLength':
                return new FilenameLengthCalculator(app, settings, stat);
            case 'tagsCount':
                return new TagsCountCalculator(app, settings, stat);
            case 'creationTime':
                return new CreationTimeCalculator(app, settings, stat);
            case 'modifiedTime':
                return new ModifiedTimeCalculator(app, settings, stat);
            case 'eccentricity':
                return new EccentricityCalculator(app, settings, stat);
            case 'closeness':
                return new centrality.ClosenessCentralityCalculator(app, settings, stat, GraphologySingleton.getGraphology(app));
            case 'betweenness':
                return new centrality.BetweennessCentralityCalculator(app, settings, stat, GraphologySingleton.getGraphology(app));
            case 'degree':
                return new centrality.DegreeCentralityCalculator(app, settings, stat, GraphologySingleton.getGraphology(app));
            case 'eigenvector':
                return new centrality.EigenvectorCentralityCalculator(app, settings, stat, GraphologySingleton.getGraphology(app));
            case 'hub':
                return new centrality.HubsCalculator(app, settings, stat, GraphologySingleton.getGraphology(app));
            case 'authority':
                return new centrality.AuthoritiesCalculator(app, settings, stat, GraphologySingleton.getGraphology(app));
            default:
                return;
        }
    }
}