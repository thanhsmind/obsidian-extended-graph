import Graph from "graphology";
import { TFile } from "obsidian";
import { LocalGraphView } from "obsidian-typings";
import { GraphInstances, ExtendedGraphInstances } from "src/internal";

export class Pathfinder {
	private instances: GraphInstances;

	constructor(instances: GraphInstances) {
		this.instances = instances;
	}

	private get app() {
		return this.instances.view.app;
	}

	public async findAndShowPaths(
		startNotePath: string,
		endNotePath: string
	): Promise<void> {
		console.log(
			"Finding paths between:",
			startNotePath,
			"and",
			endNotePath
		);

		const graph = this.getGraphologyGraph();
		if (!graph) {
			console.error("Failed to create graphology graph");
			return;
		}

		const startNode = this.app.vault.getAbstractFileByPath(
			startNotePath
		) as TFile;
		const endNode = this.app.vault.getAbstractFileByPath(
			endNotePath
		) as TFile;

		if (!startNode || !endNode) {
			console.error(
				"Start or end node not found:",
				startNotePath,
				endNotePath
			);
			return;
		}

		const startNodeId = startNode.path;
		const endNodeId = endNode.path;

		console.log("Node IDs:", startNodeId, endNodeId);

		if (!graph.hasNode(startNodeId) || !graph.hasNode(endNodeId)) {
			console.error(
				"Start or end node not in graph:",
				startNodeId,
				endNodeId
			);
			return;
		}

		const paths = this.findAllSimplePaths(graph, startNodeId, endNodeId);
		console.log("Found paths:", paths);

		// Create a new local graph view to show the path
		await this.createPathGraphView(startNotePath, endNotePath, paths);
	}

	private getGraphologyGraph(): Graph | undefined {
		// This is a simplified way to get the graphology instance.
		// You might need a more robust way depending on your architecture.
		const graphology = new Graph();
		const renderer = this.instances.renderer;

		// Add nodes
		if (renderer && renderer.nodes) {
			for (const node of renderer.nodes) {
				graphology.addNode(node.id);
			}
		}

		// Add edges from renderer links
		if (renderer && renderer.links) {
			for (const link of renderer.links) {
				if (
					graphology.hasNode(link.source.id) &&
					graphology.hasNode(link.target.id)
				) {
					graphology.addEdge(link.source.id, link.target.id);
				}
			}
		}

		return graphology;
	}

	private findAllSimplePaths(
		graph: Graph,
		start: string,
		end: string
	): string[][] {
		const paths: string[][] = [];
		const visited = new Set<string>();

		const dfs = (current: string, path: string[]) => {
			visited.add(current);
			path.push(current);

			if (current === end) {
				paths.push([...path]);
			} else {
				const neighbors = graph.neighbors(current);
				for (const neighbor of neighbors) {
					if (!visited.has(neighbor)) {
						dfs(neighbor, path);
					}
				}
			}

			path.pop();
			visited.delete(current);
		};

		dfs(start, []);
		return paths;
	}

	private async createPathGraphView(
		startNotePath: string,
		endNotePath: string,
		paths: string[][]
	): Promise<void> {
		try {
			// Create a new leaf for the local graph
			const leaf = this.app.workspace.getLeaf(true);
			await leaf.setViewState({
				type: "localgraph",
				state: {
					file: startNotePath,
				},
			});

			// Get the local graph view
			const view = leaf.view;
			if (view.getViewType() !== "localgraph") {
				console.error("Failed to create local graph view");
				return;
			}

			// Enable the extended graph plugin on this view
			if (ExtendedGraphInstances.graphsManager) {
				ExtendedGraphInstances.graphsManager.enablePlugin(
					view as LocalGraphView
				);
			}

			// If we have paths, we could potentially modify the graph data here
			// For now, just show the local graph with the start note as focus
			console.log("Created local graph view for path finding");
		} catch (error) {
			console.error("Error creating path graph view:", error);
		}
	}
}
