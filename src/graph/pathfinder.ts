import Graph from "graphology";
import { TFile } from "obsidian";
import {
	LocalGraphView,
	GraphView,
	GraphData,
	GraphNodeData,
} from "obsidian-typings";
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
		endNotePath: string,
		graphView?: GraphView | LocalGraphView
	): Promise<void> {
		console.log(
			"Finding paths between:",
			startNotePath,
			"and",
			endNotePath
		);

		const graph = await this.getGraphologyGraph();
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

		console.log("Node file paths:", startNodeId, endNodeId);

		// According to GraphNode interface, node.id should be the file path
		// So we can use the file paths directly as node IDs
		if (!graph.hasNode(startNodeId) || !graph.hasNode(endNodeId)) {
			console.error(
				"Start or end node not in graph:",
				startNodeId,
				endNodeId
			);

			// Debug: show what nodes are actually in the graph
			console.log(
				"Available nodes in graph:",
				graph.nodes().slice(0, 10),
				"..."
			);
			return;
		}

		const paths = this.findAllSimplePaths(graph, startNodeId, endNodeId);
		console.log("Found paths:", paths);

		// Create a new local graph view to show the path
		await this.createPathGraphView(startNotePath, endNotePath, paths);
	}

	private async getGraphologyGraph(): Promise<Graph | undefined> {
		// ALWAYS build fresh global graph from vault for pathfinding
		console.log(
			"Building fresh global graph from vault for pathfinding..."
		);
		return this.buildGlobalGraphFromVault();
	}

	private buildGlobalGraphFromVault(): Graph {
		const graphology = new Graph();
		const vault = this.app.vault;

		// Add ALL files as nodes (not just markdown)
		const allFiles = vault.getAllLoadedFiles();
		console.log(`Found ${allFiles.length} total files in vault`);

		// Filter and add markdown files and folders
		const validNodes: string[] = [];
		for (const file of allFiles) {
			// Add markdown files
			if (file.path.endsWith(".md")) {
				graphology.addNode(file.path);
				validNodes.push(file.path);
			}
			// Add folders as nodes too
			else if ("children" in file) {
				// This is a folder
				graphology.addNode(file.path);
				validNodes.push(file.path);
			}
		}

		console.log(`Added ${validNodes.length} nodes to graph`);

		// Add links from metadata cache
		const metadataCache = this.app.metadataCache;
		const markdownFiles = vault.getMarkdownFiles();

		for (const file of markdownFiles) {
			const cache = metadataCache.getFileCache(file);
			if (cache?.links) {
				for (const link of cache.links) {
					const linkedFile = metadataCache.getFirstLinkpathDest(
						link.link,
						file.path
					);
					if (linkedFile && graphology.hasNode(linkedFile.path)) {
						if (!graphology.hasEdge(file.path, linkedFile.path)) {
							graphology.addEdge(file.path, linkedFile.path);
						}
					}
				}
			}
		}

		console.log(
			`Built global graph with ${graphology.order} nodes and ${graphology.size} edges`
		);
		console.log("Sample nodes:", graphology.nodes().slice(0, 5));

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
			console.log("Found paths:", paths);
			console.log("Creating dedicated path result graph...");

			if (paths.length > 0) {
				console.log(
					`Successfully found ${paths.length} path(s) between:`
				);
				console.log(`Start: ${startNotePath}`);
				console.log(`End: ${endNotePath}`);

				paths.forEach((path, index) => {
					console.log(`Path ${index + 1}:`, path.join(" → "));
				});

				// Create a separate graph view showing only path results
				await this.createFilteredPathGraph(
					startNotePath,
					endNotePath,
					paths
				);
			} else {
				console.log("No paths found between the selected notes");
			}
		} catch (error) {
			console.error("Error in path visualization:", error);
		}
	}

	private async createFilteredPathGraph(
		startNotePath: string,
		endNotePath: string,
		paths: string[][]
	): Promise<void> {
		try {
			// Get all unique nodes from all paths
			const pathNodes = new Set<string>();
			paths.forEach((path) => {
				path.forEach((nodeId) => pathNodes.add(nodeId));
			});

			console.log(
				"Creating filtered graph with path nodes:",
				Array.from(pathNodes)
			);

			// Create a new tab for the path result
			const leaf = this.app.workspace.getLeaf("tab");
			await leaf.setViewState({
				type: "localgraph",
				state: {
					file: startNotePath, // Focus on start note
					options: {
						localJumps: 50, // Very high depth to ensure no limits
						showOrphans: true,
						localBacklinks: true,
						localForelinks: true,
						localInterlinks: true,
					},
				},
			});

			// Set a distinctive title for the path result tab
			if (leaf.tabHeaderInnerTitleEl) {
				const startFile = startNotePath.split("/").pop();
				const endFile = endNotePath.split("/").pop();
				leaf.tabHeaderInnerTitleEl.textContent = `📍 Path Result: ${startFile} → ${endFile}`;
				leaf.tabHeaderInnerTitleEl.style.fontWeight = "bold";
				leaf.tabHeaderInnerTitleEl.style.color = "#00ff00";
			}

			// Wait for the view to initialize
			await new Promise((resolve) => setTimeout(resolve, 500));

			const graphView = leaf.view;
			if (graphView.getViewType() !== "localgraph") {
				console.error("Failed to create path result graph view");
				return;
			}

			// Enable the extended graph plugin on this view
			if (ExtendedGraphInstances.graphsManager) {
				ExtendedGraphInstances.graphsManager.enablePlugin(
					graphView as LocalGraphView
				);
			}

			// Wait for plugin to initialize
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Get the instances for this new view
			const instances =
				ExtendedGraphInstances.graphsManager.allInstances.get(
					graphView.leaf.id
				);

			if (instances) {
				// Override engine options to remove depth limit
				await this.configurePathGraphOptions(instances, pathNodes);

				// Apply custom filter to show only path nodes
				await this.applyPathFilter(instances, pathNodes);

				// Highlight the path nodes
				await this.highlightPathNodesInView(instances, paths);

				console.log("Created dedicated path result graph");
			} else {
				console.error("Failed to get instances for path result graph");
			}
		} catch (error) {
			console.error("Error creating filtered path graph:", error);
		}
	}

	private async configurePathGraphOptions(
		instances: GraphInstances,
		pathNodes: Set<string>
	): Promise<void> {
		try {
			// Calculate the maximum depth needed for the path
			const maxPathLength = Math.max(
				...Array.from(pathNodes).map((_, index) => index + 1)
			);
			const requiredDepth = Math.max(maxPathLength, 20); // Ensure we have enough depth

			console.log(
				`Setting localJumps to ${requiredDepth} for path nodes`
			);

			// Override engine options to ensure all path nodes are visible
			instances.engine.options.localJumps = requiredDepth;
			instances.engine.options.showOrphans = true;
			instances.engine.options.localBacklinks = true;
			instances.engine.options.localForelinks = true;
			instances.engine.options.localInterlinks = true;

			// Force engine to re-render with new options
			instances.engine.render();
		} catch (error) {
			console.error("Error configuring path graph options:", error);
		}
	}

	private async applyPathFilter(
		instances: GraphInstances,
		pathNodes: Set<string>
	): Promise<void> {
		try {
			// Wait for graph to be ready
			await new Promise((resolve) => setTimeout(resolve, 300));

			// Create a custom filter that only shows path nodes
			const originalFilterData = instances.filter.filterData.bind(
				instances.filter
			);

			instances.filter.filterData = function (
				data: GraphData
			): GraphData {
				// First apply original filtering
				data = originalFilterData(data);

				// Then filter to show only path nodes
				const filteredNodes: Record<string, GraphNodeData> = {};
				for (const nodeId of pathNodes) {
					if (data.nodes[nodeId]) {
						filteredNodes[nodeId] = data.nodes[nodeId];
					}
				}

				// Only keep links between path nodes
				for (const nodeId in filteredNodes) {
					const node = filteredNodes[nodeId];
					const filteredLinks: Record<string, boolean> = {};
					for (const linkTarget in node.links) {
						if (pathNodes.has(linkTarget)) {
							filteredLinks[linkTarget] = node.links[linkTarget];
						}
					}
					node.links = filteredLinks;
				}

				data.nodes = filteredNodes;
				console.log(
					`Filtered graph to show ${
						Object.keys(filteredNodes).length
					} path nodes`
				);
				return data;
			};

			// Force a refresh to apply the filter
			instances.engine.render();
		} catch (error) {
			console.error("Error applying path filter:", error);
		}
	}

	private async highlightPathNodesInView(
		instances: GraphInstances,
		paths: string[][]
	): Promise<void> {
		try {
			if (paths.length === 0) return;

			// Get all unique nodes from all paths
			const pathNodes = new Set<string>();
			paths.forEach((path) => {
				path.forEach((nodeId) => pathNodes.add(nodeId));
			});

			console.log(
				"Highlighting path nodes in view:",
				Array.from(pathNodes)
			);

			// Wait for nodes to be rendered in the new view
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Highlight the nodes in the specified graph view instances
			if (instances.nodesSet?.extendedElementsMap) {
				for (const nodeId of pathNodes) {
					const extendedNode =
						instances.nodesSet.extendedElementsMap.get(nodeId);
					if (extendedNode) {
						// Use the search result highlighting to make path nodes stand out
						extendedNode.toggleIsSearchResult(true);
						console.log(`Highlighted node in path view: ${nodeId}`);
					} else {
						console.log(
							`Node not found in extended elements: ${nodeId}`
						);
					}
				}

				// Force a re-render to show the highlights
				instances.renderer.changed();
				console.log(
					"Path result graph re-rendered with highlighted nodes"
				);
			}
		} catch (error) {
			console.error("Error highlighting path nodes in view:", error);
		}
	}
}
