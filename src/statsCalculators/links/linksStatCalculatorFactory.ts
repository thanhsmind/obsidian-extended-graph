import { GraphAnalysisLinkCalculator, GraphAnalysisPlugin, LinkStat, LinkStatCalculator, OccurencesLinkCalculator, PluginInstances } from "src/internal";


export class LinksStatCalculatorFactory {
    static getCalculator(stat: LinkStat): LinkStatCalculator | undefined {
        switch (stat === 'size' ? PluginInstances.settings.linksSizeFunction : PluginInstances.settings.linksColorFunction) {
            case 'Adamic Adar':
            case 'BoW':
            case 'Clustering Coefficient':
            case 'Co-Citations':
            case 'Jaccard':
            case 'Otsuka-Ochiai':
            case 'Overlap':
            case 'Sentiment':
                const graphAnalysisPlugin = PluginInstances.app.plugins.getPlugin("graph-analysis") as GraphAnalysisPlugin | null;
                return graphAnalysisPlugin ? new GraphAnalysisLinkCalculator(stat, graphAnalysisPlugin.g) : undefined;
            case 'Ocurences':
                return new OccurencesLinkCalculator(stat);
            default:
                return;
        }
    }
}