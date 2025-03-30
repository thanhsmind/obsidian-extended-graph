import { GraphologySingleton } from "../graphology";
import { BacklinkCountCalculator, ConstantCalculator, CreationTimeCalculator, EccentricityCalculator, FilenameLengthCalculator, ForwardlinkCountCalculator, ModifiedTimeCalculator, NodeStat, NodeStatCalculator, NodeStatFunction, PluginInstances, TagsCountCalculator } from "src/internal";
import * as centrality from "./centralityCalculator";


export class NodeStatCalculatorFactory {
    static getCalculator(stat: NodeStat): NodeStatCalculator | undefined {
        switch (stat === 'size' ? PluginInstances.settings.nodesSizeFunction : PluginInstances.settings.nodesColorFunction) {
            case 'constant':
                return new ConstantCalculator(stat);
            case 'backlinksCount':
                return new BacklinkCountCalculator(stat);
            case 'forwardlinksCount':
                return new ForwardlinkCountCalculator(stat, true);
            case 'forwardUniquelinksCount':
                return new ForwardlinkCountCalculator(stat, false);
            case 'filenameLength':
                return new FilenameLengthCalculator(stat);
            case 'tagsCount':
                return new TagsCountCalculator(stat);
            case 'creationTime':
                return new CreationTimeCalculator(stat);
            case 'modifiedTime':
                return new ModifiedTimeCalculator(stat);
            case 'eccentricity':
                return new EccentricityCalculator(stat);
            case 'closeness':
                return new centrality.ClosenessCentralityCalculator(stat, GraphologySingleton.getGraphology());
            case 'betweenness':
                return new centrality.BetweennessCentralityCalculator(stat, GraphologySingleton.getGraphology());
            case 'degree':
                return new centrality.DegreeCentralityCalculator(stat, GraphologySingleton.getGraphology());
            case 'eigenvector':
                return new centrality.EigenvectorCentralityCalculator(stat, GraphologySingleton.getGraphology());
            case 'hub':
                return new centrality.HubsCalculator(stat, GraphologySingleton.getGraphology());
            case 'authority':
                return new centrality.AuthoritiesCalculator(stat, GraphologySingleton.getGraphology());
            default:
                return;
        }
    }
}