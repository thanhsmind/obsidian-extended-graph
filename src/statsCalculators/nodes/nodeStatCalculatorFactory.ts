import {
    BacklinkCountCalculator,
    ConstantCalculator,
    CreationTimeCalculator,
    EccentricityCalculator,
    FilenameLengthCalculator,
    ForwardlinkCountCalculator,
    GraphInstances,
    GraphologyGraph,
    ModifiedTimeCalculator,
    NodeStat,
    NodeStatCalculator,
    PluginInstances,
    SentimentCalculator,
    TagsCountCalculator,
    TopologicalSortCalculator
} from "src/internal";
import * as centrality from "./centralityCalculator";


export class NodeStatCalculatorFactory {
    static getCalculator(stat: NodeStat, instances?: GraphInstances): NodeStatCalculator | undefined {
        const settings = (instances ?? PluginInstances).settings;
        const g = instances?.graphologyGraph;
        const fn = stat === 'size' ? settings.nodesSizeFunction : settings.nodesColorFunction;
        switch (fn) {
            case 'constant':
                return new ConstantCalculator(stat, g);
            case 'backlinksCount':
                return !settings.invertNodeStats ? new BacklinkCountCalculator(stat, true, g) : new ForwardlinkCountCalculator(stat, true, g);
            case 'backUniquelinksCount':
                return !settings.invertNodeStats ? new BacklinkCountCalculator(stat, false, g) : new ForwardlinkCountCalculator(stat, false, g);
            case 'forwardlinksCount':
                return !settings.invertNodeStats ? new ForwardlinkCountCalculator(stat, true, g) : new BacklinkCountCalculator(stat, true, g);
            case 'forwardUniquelinksCount':
                return !settings.invertNodeStats ? new ForwardlinkCountCalculator(stat, false, g) : new BacklinkCountCalculator(stat, false, g);
            case 'filenameLength':
                return new FilenameLengthCalculator(stat, g);
            case 'tagsCount':
                return new TagsCountCalculator(stat, g);
            case 'creationTime':
                return new CreationTimeCalculator(stat, g);
            case 'modifiedTime':
                return new ModifiedTimeCalculator(stat, g);
            case 'eccentricity':
                return new EccentricityCalculator(stat, g);
            case 'closeness':
                return new centrality.ClosenessCentralityCalculator(stat, g);
            case 'betweenness':
                return new centrality.BetweennessCentralityCalculator(stat, g);
            case 'degree':
                return new centrality.DegreeCentralityCalculator(stat, g);
            case 'eigenvector':
                return new centrality.EigenvectorCentralityCalculator(stat, g);
            case 'hub':
                return new centrality.HubsCalculator(stat, g);
            case 'authority':
                return new centrality.AuthoritiesCalculator(stat, g);
            case 'topological':
                return new TopologicalSortCalculator(stat, g);
            case 'sentiment':
                return new SentimentCalculator(stat, g);
            default:
                return;
        }
    }
}