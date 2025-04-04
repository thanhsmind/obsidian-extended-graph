import { TFile } from "obsidian";
import eccentricity from "graphology-metrics/node/eccentricity";
import { GraphologySingleton } from "../graphology";
import { NodeStatCalculator, PluginInstances } from "src/internal";

export class EccentricityCalculator extends NodeStatCalculator {

    override async getStat(file: TFile): Promise<number> {
        const connectedGraph = GraphologySingleton.getConnectedGraphology(file.path);
        return eccentricity(connectedGraph, file.path);
    }

    override getLink(): string {
        return "https://en.wikipedia.org/wiki/Closeness_centrality";
    }
}