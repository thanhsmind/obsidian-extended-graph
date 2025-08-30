import Graph from "graphology";
import { TFile } from "obsidian";
// Removed unused import
import { GraphInstances, ExtendedGraphInstances } from "src/internal";

export class Pathfinder {
	private instances: GraphInstances;

	constructor(instances: GraphInstances) {
		this.instances = instances;
	}

	private get app() {
		return (this.instances as any).app || this.instances.view?.app;
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
				type: "graph", // Use global graph for better stability
				state: {}, // No specific file focus for global graph
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
			if (graphView.getViewType() !== "graph") {
				console.error("Failed to create path result graph view");
				return;
			}

			// Enable the extended graph plugin on this view
			if (ExtendedGraphInstances.graphsManager) {
				ExtendedGraphInstances.graphsManager.enablePlugin(
					graphView as any
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
				// Apply custom filter to show only path nodes (this handles both filtering and highlighting)
				await this.applyPathFilter(instances, pathNodes);

				console.log("Created dedicated path result graph");
			} else {
				console.error("Failed to get instances for path result graph");
			}
		} catch (error) {
			console.error("Error creating filtered path graph:", error);
		}
	}

	private async applyPathFilter(
		instances: GraphInstances,
		pathNodes: Set<string>
	): Promise<void> {
		try {
			// Wait for graph to be ready
			await new Promise((resolve) => setTimeout(resolve, 1000));

			console.log(
				"Applying path filter for nodes:",
				Array.from(pathNodes)
			);

			// Try using search functionality to filter and highlight
			if (instances.search) {
				console.log("Using search functionality to filter path nodes");

				// Clear any existing search
				if (instances.search.clearSearch) {
					instances.search.clearSearch();
				}

				// Create search terms from path nodes (just file names)
				const searchTerms = Array.from(pathNodes).map((path) => {
					const filename =
						path.split("/").pop()?.replace(".md", "") || path;
					return `"${filename}"`; // Quote each term for exact match
				});

				console.log("Setting search terms:", searchTerms);

				// Apply search which should filter the graph
				if (instances.search.setSearchTerm) {
					instances.search.setSearchTerm(searchTerms.join(" OR "));
				}

				// Set matches directly if possible
				if (instances.search.setMatches) {
					instances.search.setMatches(Array.from(pathNodes));
				}

				console.log("Search filter applied");
			}

			// Fallback: try to override filter function if search doesn't work
			else if (instances.filter && instances.filter.filterData) {
				console.log("Attempting to override filter function...");

				// Store the original filter
				const originalFilter = instances.filter.filterData.bind(
					instances.filter
				);

				// Override with our custom filter
				instances.filter.filterData = function (data: any) {
					console.log(
						"Custom filter called with data containing",
						Object.keys(data.nodes || {}).length,
						"nodes"
					);

					// Start with original data
					const original = originalFilter(data);

					// Create filtered result with only path nodes
					const result = {
						...original,
						nodes: {},
					};

					// Add only path nodes
					for (const nodeId of pathNodes) {
						if (original.nodes[nodeId]) {
							result.nodes[nodeId] = {
								...original.nodes[nodeId],
								color: "#ff0000", // Red color
								size: 3, // Larger size
							};
							console.log(
								"Added path node to filter result:",
								nodeId
							);
						} else {
							console.log(
								"Path node not found in original data:",
								nodeId
							);
						}
					}

					console.log(
						"Filter result: showing",
						Object.keys(result.nodes).length,
						"path nodes"
					);
					return result;
				};

				console.log("Custom filter function set");
			}

			// Also try to manually highlight the nodes if possible
			await new Promise((resolve) => setTimeout(resolve, 500));

			if (instances.nodesSet?.extendedElementsMap) {
				let highlightedCount = 0;
				for (const nodeId of pathNodes) {
					const extendedNode =
						instances.nodesSet.extendedElementsMap.get(nodeId);
					if (
						extendedNode &&
						typeof extendedNode.toggleIsSearchResult === "function"
					) {
						try {
							extendedNode.toggleIsSearchResult(true);
							highlightedCount++;
							console.log(`Highlighted path node: ${nodeId}`);
						} catch (err) {
							console.warn(
								`Failed to highlight node ${nodeId}:`,
								err
							);
						}
					}
				}
				console.log(`Highlighted ${highlightedCount} path nodes`);
			}

			// Force multiple renders to ensure filter takes effect
			console.log("Applying path filter - forcing filter refresh");

			// First, force the filter to refresh
			if (instances.filter && instances.filter.refresh) {
				instances.filter.refresh();
			}

			// Then force engine render
			instances.engine.render();

			// Wait and render again to ensure filter is applied
			await new Promise((resolve) => setTimeout(resolve, 200));
			instances.engine.render();

			console.log("Path filter rendering complete");
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

			// Wait longer for nodes to be rendered and extended elements to be ready
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Try multiple times to get extended elements (they might not be ready immediately)
			let attempts = 0;
			const maxAttempts = 5;

			while (attempts < maxAttempts) {
				if (
					instances.nodesSet?.extendedElementsMap &&
					instances.nodesSet.extendedElementsMap.size > 0
				) {
					console.log(
						`Extended elements ready after ${attempts + 1} attempts`
					);
					break;
				}
				console.log(
					`Waiting for extended elements... attempt ${attempts + 1}`
				);
				await new Promise((resolve) => setTimeout(resolve, 500));
				attempts++;
			}

			// Highlight the nodes if extended elements are available
			if (
				instances.nodesSet?.extendedElementsMap &&
				instances.nodesSet.extendedElementsMap.size > 0
			) {
				let highlightedCount = 0;
				for (const nodeId of pathNodes) {
					const extendedNode =
						instances.nodesSet.extendedElementsMap.get(nodeId);
					if (extendedNode && extendedNode.toggleIsSearchResult) {
						try {
							extendedNode.toggleIsSearchResult(true);
							highlightedCount++;
							console.log(
								`Highlighted node in path view: ${nodeId}`
							);
						} catch (err) {
							console.warn(
								`Failed to highlight node ${nodeId}:`,
								err
							);
						}
					} else {
						console.log(
							`Node not found in extended elements: ${nodeId}`
						);
					}
				}

				// Force a re-render to show the highlights
				if (highlightedCount > 0 && instances.renderer?.changed) {
					instances.renderer.changed();
					console.log(
						`Path result graph re-rendered with ${highlightedCount} highlighted nodes`
					);
				}
			} else {
				console.warn(
					"Extended elements map not available for highlighting"
				);
			}
		} catch (error) {
			console.error("Error highlighting path nodes in view:", error);
		}
	}
}
