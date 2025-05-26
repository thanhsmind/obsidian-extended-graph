import { GraphologySingleton } from "../graphology";
import reverse from 'graphology-operators/reverse'
import { BacklinkCountCalculator, ConstantCalculator, CreationTimeCalculator, EccentricityCalculator, FilenameLengthCalculator, ForwardlinkCountCalculator, ModifiedTimeCalculator, NodeStat, NodeStatCalculator, NodeStatFunction, PluginInstances, TagsCountCalculator, TopologicalSortCalculator } from "src/internal";
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
                return new centrality.ClosenessCentralityCalculator(stat);
            case 'betweenness':
                return new centrality.BetweennessCentralityCalculator(stat);
            case 'degree':
                return new centrality.DegreeCentralityCalculator(stat);
            case 'eigenvector':
                return new centrality.EigenvectorCentralityCalculator(stat);
            case 'hub':
                return new centrality.HubsCalculator(stat);
            case 'authority':
                return new centrality.AuthoritiesCalculator(stat);
            case 'topological':
                return new TopologicalSortCalculator(stat);
            default:
                return;
        }
    }
}