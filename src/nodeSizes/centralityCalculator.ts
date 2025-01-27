import { App, TFile } from "obsidian";
import Graphology from 'graphology';
import { degreeCentrality } from "graphology-metrics/centrality/degree";
import eigenvectorCentrality from "graphology-metrics/centrality/eigenvector";
import closenessCentrality from "graphology-metrics/centrality/closeness";
import betweennessCentrality from "graphology-metrics/centrality/betweenness";
import hits from "graphology-metrics/centrality/hits";
import { NodeSizeCalculator } from "src/internal";

type CentralityMapping = Record<string, number>;

export abstract class CentralityCalculator extends NodeSizeCalculator {
    cm: CentralityMapping;
    link: string;

    constructor(app: App, g: Graphology, link: string = "") {
        super(app);
        this.link = link;
        this.computeCentralityMap(g);
    }

    override async getSize(file: TFile): Promise<number> {
        return this.cm[file.path];
    }

    protected abstract computeCentralityMap(g: Graphology): void;
    abstract getLink(): string;
}

export class DegreeCentralityCalculator extends CentralityCalculator {
    override computeCentralityMap(g: Graphology) {
        this.cm = degreeCentrality(g);
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/Degree_(graph_theory)";
    }
}

export class EigenvectorCentralityCalculator extends CentralityCalculator {
    override computeCentralityMap(g: Graphology) {
        this.cm = eigenvectorCentrality(g);
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/Eigenvector_centrality";
    }
}

export class ClosenessCentralityCalculator extends CentralityCalculator {
    override computeCentralityMap(g: Graphology) {
        this.cm = closenessCentrality(g);
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/Closeness_centrality";
    }
}

export class BetweennessCentralityCalculator extends CentralityCalculator {
    override computeCentralityMap(g: Graphology) {
        this.cm = betweennessCentrality(g);
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/Betweenness_centrality";
    }
}

export class HubsCalculator extends CentralityCalculator {
    override computeCentralityMap(g: Graphology) {
        const {hubs, authorities} = hits(g);
        this.cm = hubs;
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/HITS_algorithm";
    }
}

export class AuthoritiesCalculator extends CentralityCalculator {
    override computeCentralityMap(g: Graphology) {
        const {hubs, authorities} = hits(g);
        this.cm = authorities;
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/HITS_algorithm";
    }
}