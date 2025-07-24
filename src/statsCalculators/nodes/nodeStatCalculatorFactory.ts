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
    TagsCountCalculator,
    TopologicalSortCalculator
} from "src/internal";
import * as centrality from "./centralityCalculator";


export class NodeStatCalculatorFactory {
    static getCalculator(stat: NodeStat, instances?: GraphInstances): NodeStatCalculator | undefined {
        const fn = stat === 'size' ? (instances ?? PluginInstances).settings.nodesSizeFunction : (instances ?? PluginInstances).settings.nodesColorFunction;
        switch (fn) {
            case 'constant':
                return new ConstantCalculator(stat, instances?.graphologyGraph);
            case 'backlinksCount':
                return new BacklinkCountCalculator(stat, instances?.graphologyGraph);
            case 'forwardlinksCount':
                return new ForwardlinkCountCalculator(stat, true, instances?.graphologyGraph);
            case 'forwardUniquelinksCount':
                return new ForwardlinkCountCalculator(stat, false, instances?.graphologyGraph);
            case 'filenameLength':
                return new FilenameLengthCalculator(stat, instances?.graphologyGraph);
            case 'tagsCount':
                return new TagsCountCalculator(stat, instances?.graphologyGraph);
            case 'creationTime':
                return new CreationTimeCalculator(stat, instances?.graphologyGraph);
            case 'modifiedTime':
                return new ModifiedTimeCalculator(stat, instances?.graphologyGraph);
            case 'eccentricity':
                return new EccentricityCalculator(stat, instances?.graphologyGraph);
            case 'closeness':
                return new centrality.ClosenessCentralityCalculator(stat, instances?.graphologyGraph);
            case 'betweenness':
                return new centrality.BetweennessCentralityCalculator(stat, instances?.graphologyGraph);
            case 'degree':
                return new centrality.DegreeCentralityCalculator(stat, instances?.graphologyGraph);
            case 'eigenvector':
                return new centrality.EigenvectorCentralityCalculator(stat, instances?.graphologyGraph);
            case 'hub':
                return new centrality.HubsCalculator(stat, instances?.graphologyGraph);
            case 'authority':
                return new centrality.AuthoritiesCalculator(stat, instances?.graphologyGraph);
            case 'topological':
                return new TopologicalSortCalculator(stat, instances?.graphologyGraph);
            default:
                return;
        }
    }
}