import Graph from "graphology";
import { TFile, Notice } from "obsidian";
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

		// Check if nodes exist in the graph
		if (!graph.hasNode(startNotePath)) {
			console.error("Start node not found in graph:", startNotePath);
			console.log("Available nodes:", graph.nodes().slice(0, 10));
			return;
		}

		if (!graph.hasNode(endNotePath)) {
			console.error("End node not found in graph:", endNotePath);
			console.log("Available nodes:", graph.nodes().slice(0, 10));
			return;
		}

		console.log(
			"Both start and end nodes found in graph:",
			startNotePath,
			"->",
			endNotePath
		);

		// Use the paths directly as node IDs since they exist in graph
		const startNodeId = startNotePath;
		const endNodeId = endNotePath;

		console.log("Node file paths:", startNodeId, endNodeId);

		const paths = this.findAllSimplePaths(graph, startNodeId, endNodeId);
		console.log("Found paths:", paths);

		// Use existing Obsidian graph system
		await this.createObsidianPathGraph(startNotePath, endNotePath, paths);
		this.showPathInConsole(startNotePath, endNotePath, paths);
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

					// Add only path nodes with complete properties
					for (const nodeId of pathNodes) {
						if (original.nodes[nodeId]) {
							const originalNode = original.nodes[nodeId];
							result.nodes[nodeId] = {
								...originalNode,
								color: "#ff0000", // Red color
								size: 3, // Larger size
								visible: true, // Ensure visible
								opacity: 1.0, // Full opacity
								display: true, // Force display
								stroke: "#ffffff", // White border
								strokeWidth: 2, // Border width
								fill: "#ff0000", // Fill color
								radius: 10, // Circle radius
							};
							console.log(
								"Added path node to filter result:",
								nodeId
							);
						} else {
							// Create missing node with full properties
							console.log("Creating missing path node:", nodeId);
							result.nodes[nodeId] = {
								color: "#ff0000", // Red color
								size: 3, // Larger size
								visible: true, // Ensure visible
								opacity: 1.0, // Full opacity
								display: true, // Force display
								stroke: "#ffffff", // White border
								strokeWidth: 2, // Border width
								fill: "#ff0000", // Fill color
								radius: 10, // Circle radius
								type: "md", // File type
								links: {}, // Empty links
							};
						}
					}

					// Also need to update links structure for the filtered result
					result.links = {};
					for (const sourceId in result.nodes) {
						if (result.nodes[sourceId].links) {
							result.links[sourceId] = {};
							for (const targetId in result.nodes[sourceId]
								.links) {
								if (result.nodes[targetId]) {
									// Only if target is also in our filtered nodes
									result.links[sourceId][targetId] = true;
								}
							}
						}
					}

					console.log(
						"Filter result: showing",
						Object.keys(result.nodes).length,
						"path nodes with",
						Object.keys(result.links).length,
						"link sources"
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

	// NEW: Simple solution that creates a markdown result instead of complex graph filtering
	private async createSimplePathResult(
		startNotePath: string,
		endNotePath: string,
		paths: string[][]
	): Promise<void> {
		try {
			console.log("Creating simple path result view...");

			if (paths.length === 0) {
				console.log("No paths found");
				return;
			}

			// Collect all unique nodes from all paths
			const pathNodes = new Set<string>();
			paths.forEach((path) => {
				path.forEach((nodeId) => pathNodes.add(nodeId));
			});

			// Create a new tab with markdown view
			const leaf = this.app.workspace.getLeaf("tab");

			// Create content showing the path
			const startFile =
				startNotePath.split("/").pop()?.replace(".md", "") ||
				startNotePath;
			const endFile =
				endNotePath.split("/").pop()?.replace(".md", "") || endNotePath;

			let content = `# 🔍 Path Result: ${startFile} → ${endFile}\n\n`;
			content += `**Found ${paths.length} path(s) connecting ${pathNodes.size} unique nodes**\n\n`;

			// Show each path with clickable links
			paths.forEach((path, index) => {
				content += `## 🛣️ Path ${index + 1}\n`;
				const pathLabels = path.map((nodePath) => {
					const fileName =
						nodePath.split("/").pop()?.replace(".md", "") ||
						nodePath;
					return `[[${nodePath}|${fileName}]]`;
				});
				content += `${pathLabels.join(" **→** ")}\n\n`;
				content += `*${path.length} nodes in this path*\n\n`;
			});

			// Show all unique nodes in the path
			content += `## 📋 All Path Nodes (${pathNodes.size})\n`;
			const sortedNodes = Array.from(pathNodes).sort();
			sortedNodes.forEach((nodePath, index) => {
				const fileName =
					nodePath.split("/").pop()?.replace(".md", "") || nodePath;
				content += `${index + 1}. [[${nodePath}|${fileName}]]\n`;
			});

			content += `\n---\n*Generated by Extended Graph Pathfinder*`;

			// Create a temporary file to display the content
			const vault = this.app.vault;
			const tempFileName = `Path Result - ${startFile} to ${endFile}.md`;

			try {
				// Try to create a temporary file first
				const tempFile = await vault.create(tempFileName, content);

				// Open the file in the new tab
				await leaf.setViewState({
					type: "markdown",
					state: {
						file: tempFile.path,
						mode: "preview",
					},
				});

				console.log("Created temporary file:", tempFileName);
			} catch (error) {
				console.log(
					"File exists or create failed, trying direct content approach..."
				);

				// Fallback: try setting content directly
				await leaf.setViewState({
					type: "markdown",
					state: {
						source: content,
						mode: "source",
					},
				});

				// Alternative approach: use editor if available
				setTimeout(() => {
					const view = leaf.view as any;
					if (view && view.editor) {
						view.editor.setValue(content);
						// Switch to preview mode
						if (view.setMode) {
							view.setMode("preview");
						}
					}
				}, 200);
			}

			// Set tab title
			if (leaf.tabHeaderInnerTitleEl) {
				leaf.tabHeaderInnerTitleEl.textContent = `🔍 Path: ${startFile} → ${endFile}`;
				leaf.tabHeaderInnerTitleEl.style.fontWeight = "bold";
				leaf.tabHeaderInnerTitleEl.style.color = "#00ff00";
			}

			console.log("Created simple path result view");
		} catch (error) {
			console.error("Error creating simple path result:", error);
		}
	}

	private showPathInConsole(
		startNotePath: string,
		endNotePath: string,
		paths: string[][]
	): void {
		const startFile =
			startNotePath.split("/").pop()?.replace(".md", "") || startNotePath;
		const endFile =
			endNotePath.split("/").pop()?.replace(".md", "") || endNotePath;

		console.log(`\n🔍 PATH RESULT: ${startFile} → ${endFile}`);
		console.log(`Found ${paths.length} path(s):`);

		paths.forEach((path, index) => {
			const pathLabels = path.map(
				(nodePath) =>
					nodePath.split("/").pop()?.replace(".md", "") || nodePath
			);
			console.log(`Path ${index + 1}: ${pathLabels.join(" → ")}`);
		});

		// Also show a user-friendly notice
		const pathSummary = paths
			.map((path, index) => {
				const pathLabels = path.map(
					(nodePath) =>
						nodePath.split("/").pop()?.replace(".md", "") ||
						nodePath
				);
				return `Path ${index + 1}: ${pathLabels.join(" → ")}`;
			})
			.join("\n");

		// Show user-friendly notice
		new Notice(
			`🔍 Found ${paths.length} path(s) from ${startFile} to ${endFile}!\n\n${pathSummary}`,
			10000
		);
	}

	private async createPathGraphVisualization(
		startNotePath: string,
		endNotePath: string,
		paths: string[][]
	): Promise<void> {
		try {
			console.log("Creating path graph visualization...");

			if (paths.length === 0) {
				console.log("No paths found");
				return;
			}

			// Collect all unique nodes from all paths
			const pathNodes = new Set<string>();
			paths.forEach((path) => {
				path.forEach((nodeId) => pathNodes.add(nodeId));
			});

			// Create HTML content with SVG graph
			const startFile =
				startNotePath.split("/").pop()?.replace(".md", "") ||
				startNotePath;
			const endFile =
				endNotePath.split("/").pop()?.replace(".md", "") || endNotePath;

			const htmlContent = this.generateGraphHTML(
				startFile,
				endFile,
				paths,
				pathNodes
			);

			// Create a new tab with HTML content
			const leaf = this.app.workspace.getLeaf("tab");

			// Create temporary HTML file
			const vault = this.app.vault;
			const tempFileName = `Path Graph - ${startFile} to ${endFile}.html`;

			try {
				// Create HTML file
				const tempFile = await vault.create(tempFileName, htmlContent);

				// Open HTML file in new tab
				await leaf.setViewState({
					type: "markdown",
					state: {
						file: tempFile.path,
						mode: "preview",
					},
				});

				console.log("Created path graph HTML file:", tempFileName);
			} catch (error) {
				console.log("HTML file creation failed:", error);
			}

			// Set tab title
			if (leaf.tabHeaderInnerTitleEl) {
				leaf.tabHeaderInnerTitleEl.textContent = `📊 Path Graph: ${startFile} → ${endFile}`;
				leaf.tabHeaderInnerTitleEl.style.fontWeight = "bold";
				leaf.tabHeaderInnerTitleEl.style.color = "#00ff00";
			}

			console.log("Created path graph visualization");
		} catch (error) {
			console.error("Error creating path graph visualization:", error);
		}
	}

	private generateGraphHTML(
		startFile: string,
		endFile: string,
		paths: string[][],
		pathNodes: Set<string>
	): string {
		// Generate SVG-based graph visualization
		const nodes = Array.from(pathNodes);
		const svgWidth = 800;
		const svgHeight = 600;
		const nodeRadius = 30;

		// Calculate node positions in a simple layout
		const positions = this.calculateNodePositions(
			nodes,
			svgWidth,
			svgHeight,
			nodeRadius
		);

		// Generate SVG content
		let svgContent = `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`;

		// Add background
		svgContent += `<rect width="100%" height="100%" fill="#1e1e1e"/>`;

		// Draw edges first (so they appear behind nodes)
		paths.forEach((path) => {
			for (let i = 0; i < path.length - 1; i++) {
				const fromNode = path[i];
				const toNode = path[i + 1];
				const fromPos = positions[fromNode];
				const toPos = positions[toNode];

				if (fromPos && toPos) {
					svgContent += `<line x1="${fromPos.x}" y1="${fromPos.y}" x2="${toPos.x}" y2="${toPos.y}" 
						stroke="#ff6b6b" stroke-width="3" marker-end="url(#arrowhead)"/>`;
				}
			}
		});

		// Add arrow marker definition
		svgContent += `
			<defs>
				<marker id="arrowhead" markerWidth="10" markerHeight="7" 
					refX="9" refY="3.5" orient="auto">
					<polygon points="0 0, 10 3.5, 0 7" fill="#ff6b6b"/>
				</marker>
			</defs>
		`;

		// Draw nodes
		nodes.forEach((nodeId) => {
			const pos = positions[nodeId];
			const fileName =
				nodeId.split("/").pop()?.replace(".md", "") || nodeId;
			const isStart = nodeId.includes(startFile);
			const isEnd = nodeId.includes(endFile);

			const fillColor = isStart
				? "#4caf50"
				: isEnd
				? "#f44336"
				: "#2196f3";

			svgContent += `
				<circle cx="${pos.x}" cy="${pos.y}" r="${nodeRadius}" 
					fill="${fillColor}" stroke="#ffffff" stroke-width="2"/>
				<text x="${pos.x}" y="${pos.y + 5}" text-anchor="middle" 
					fill="white" font-size="12" font-family="Arial">
					${fileName.length > 15 ? fileName.substring(0, 12) + "..." : fileName}
				</text>
			`;
		});

		svgContent += `</svg>`;

		// Create complete HTML document
		return `
<!DOCTYPE html>
<html>
<head>
	<title>Path Graph: ${startFile} → ${endFile}</title>
	<style>
		body {
			margin: 0;
			padding: 20px;
			background: #1e1e1e;
			color: white;
			font-family: Arial, sans-serif;
		}
		.header {
			text-align: center;
			margin-bottom: 20px;
		}
		.graph-container {
			display: flex;
			justify-content: center;
			align-items: center;
		}
		.legend {
			margin-top: 20px;
			text-align: center;
		}
		.legend-item {
			display: inline-block;
			margin: 0 15px;
		}
		.legend-color {
			display: inline-block;
			width: 20px;
			height: 20px;
			border-radius: 50%;
			margin-right: 5px;
			vertical-align: middle;
		}
	</style>
</head>
<body>
	<div class="header">
		<h1>📊 Path Graph: ${startFile} → ${endFile}</h1>
		<p>Found ${paths.length} path(s) connecting ${pathNodes.size} nodes</p>
	</div>
	
	<div class="graph-container">
		${svgContent}
	</div>
	
	<div class="legend">
		<div class="legend-item">
			<span class="legend-color" style="background: #4caf50;"></span>
			Start Node
		</div>
		<div class="legend-item">
			<span class="legend-color" style="background: #f44336;"></span>
			End Node
		</div>
		<div class="legend-item">
			<span class="legend-color" style="background: #2196f3;"></span>
			Path Node
		</div>
	</div>
	
	<div style="margin-top: 30px; text-align: center; color: #888;">
		<p>Generated by Extended Graph Pathfinder</p>
	</div>
</body>
</html>
		`;
	}

	private calculateNodePositions(
		nodes: string[],
		width: number,
		height: number,
		nodeRadius: number
	): Record<string, { x: number; y: number }> {
		const positions: Record<string, { x: number; y: number }> = {};
		const margin = nodeRadius * 2;
		const usableWidth = width - margin * 2;
		const usableHeight = height - margin * 2;

		// Simple circular layout
		const centerX = width / 2;
		const centerY = height / 2;
		const radius = Math.min(usableWidth, usableHeight) / 3;

		nodes.forEach((nodeId, index) => {
			const angle = (2 * Math.PI * index) / nodes.length;
			const x = centerX + radius * Math.cos(angle);
			const y = centerY + radius * Math.sin(angle);

			positions[nodeId] = { x, y };
		});

		return positions;
	}

	// NEW: Use existing Obsidian graph system instead of custom SVG
	private async createObsidianPathGraph(
		startNotePath: string,
		endNotePath: string,
		paths: string[][]
	): Promise<void> {
		try {
			console.log(
				"Creating Obsidian path graph using existing system..."
			);

			if (paths.length === 0) {
				console.log("No paths found");
				return;
			}

			// Collect all unique nodes from paths
			const pathNodes = new Set<string>();
			paths.forEach((path) => {
				path.forEach((nodeId) => pathNodes.add(nodeId));
			});

			// Create a global graph view
			const leaf = this.app.workspace.getLeaf("tab");
			await leaf.setViewState({
				type: "graph",
				state: {},
			});

			const graphView = leaf.view;
			if (graphView.getViewType() !== "graph") {
				console.error("Failed to create graph view");
				return;
			}

			// Set tab title
			const startFile =
				startNotePath.split("/").pop()?.replace(".md", "") ||
				startNotePath;
			const endFile =
				endNotePath.split("/").pop()?.replace(".md", "") || endNotePath;

			if (leaf.tabHeaderInnerTitleEl) {
				leaf.tabHeaderInnerTitleEl.textContent = `🔍 Path: ${startFile} → ${endFile}`;
				leaf.tabHeaderInnerTitleEl.style.fontWeight = "bold";
				leaf.tabHeaderInnerTitleEl.style.color = "#00ff00";
			}

			// Wait for view to initialize
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Enable extended graph plugin on this view
			if (ExtendedGraphInstances.graphsManager) {
				ExtendedGraphInstances.graphsManager.enablePlugin(
					graphView as any
				);
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}

			// Get instances for this view
			const instances =
				ExtendedGraphInstances.graphsManager.allInstances.get(
					graphView.leaf.id
				);

			if (instances) {
				console.log(
					"Got graph instances, applying path visualization..."
				);

				// Apply multiple visualization techniques for clear path visibility
				await this.enhancePathVisibility(instances, pathNodes, paths);

				console.log(
					"Applied enhanced path visualization to Obsidian graph"
				);
			} else {
				console.error("No instances found for graph view");
			}
		} catch (error) {
			console.error("Error creating Obsidian path graph:", error);
		}
	}

	private async applySimplePathHighlight(
		instances: GraphInstances,
		pathNodes: Set<string>
	): Promise<void> {
		try {
			// Wait for graph to be ready
			await new Promise((resolve) => setTimeout(resolve, 1000));

			console.log(
				"Applying simple path highlight for nodes:",
				Array.from(pathNodes)
			);

			// Method 1: Try to highlight using search if available
			const pathNodeNames = Array.from(pathNodes).map((path) => {
				return path.split("/").pop()?.replace(".md", "") || path;
			});

			console.log("Node names for search:", pathNodeNames);

			// Method 2: Direct node highlighting
			if (instances.nodesSet?.extendedElementsMap) {
				let highlightedCount = 0;

				// Wait a bit more for elements to be ready
				await new Promise((resolve) => setTimeout(resolve, 2000));

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
					} else {
						console.log(
							`Node not found in extended elements: ${nodeId}`
						);
					}
				}

				console.log(
					`Successfully highlighted ${highlightedCount} of ${pathNodes.size} path nodes`
				);

				// Force render to show highlights
				if (instances.renderer?.changed) {
					instances.renderer.changed();
				}
			} else {
				console.warn("Extended elements map not available");
			}
		} catch (error) {
			console.error("Error applying simple path highlight:", error);
		}
	}

	private async enhancePathVisibility(
		instances: GraphInstances,
		pathNodes: Set<string>,
		paths: string[][]
	): Promise<void> {
		try {
			console.log("Enhancing path visibility...");

			// Wait for graph to be fully loaded
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Step 1: Fade out non-path nodes by filtering
			await this.applyPathOnlyFilter(instances, pathNodes, paths);

			// Step 2: Highlight path nodes with strong colors
			await this.highlightPathNodes(instances, pathNodes, paths);

			// Step 3: Enhance path links visibility
			await this.enhancePathLinks(instances, paths);

			// Step 4: Focus view on path nodes
			await this.focusOnPath(instances, pathNodes);

			console.log("Enhanced path visibility applied");
		} catch (error) {
			console.error("Error enhancing path visibility:", error);
		}
	}

	private async applyPathOnlyFilter(
		instances: GraphInstances,
		pathNodes: Set<string>,
		paths: string[][]
	): Promise<void> {
		try {
			console.log("Applying path-only filter...");

			// Override the filter to show only path nodes and their immediate neighbors
			if (instances.filter && instances.filter.filterData) {
				const originalFilter = instances.filter.filterData.bind(
					instances.filter
				);

				// Copy variables for closure
				const pathNodesCopy = new Set(pathNodes);
				const pathsCopy = [...paths];

				instances.filter.filterData = function (data: any): any {
					const original = originalFilter(data);

					// Build filtered data with only path nodes and path links
					const filteredData: any = {
						nodes: {},
						links: {},
					};

					// Add all path nodes
					for (const nodeId of pathNodesCopy) {
						if (original.nodes[nodeId]) {
							filteredData.nodes[nodeId] = {
								...original.nodes[nodeId],
								// Make path nodes more prominent
								color: "#ff4444", // Bright red
								size: 2, // Larger size
								links: {}, // Will be filled below
							};
						}
					}

					// Add path links - only unique connections that follow the actual path sequence
					const addedLinks = new Set<string>(); // Track added links to avoid duplicates

					pathsCopy.forEach((path, pathIndex) => {
						console.log(
							`Processing path ${pathIndex + 1}:`,
							path.map((p) =>
								p.split("/").pop()?.replace(".md", "")
							)
						);

						for (let i = 0; i < path.length - 1; i++) {
							const fromNode = path[i];
							const toNode = path[i + 1];
							const linkKey = `${fromNode}→${toNode}`;

							// Skip if this exact link was already added
							if (addedLinks.has(linkKey)) {
								console.log(
									`Skipping duplicate link: ${fromNode} → ${toNode}`
								);
								continue;
							}

							// Ensure both nodes exist in filtered data
							if (
								filteredData.nodes[fromNode] &&
								filteredData.nodes[toNode]
							) {
								// Add only directional link (no bidirectional to reduce visual clutter)
								if (!filteredData.nodes[fromNode].links) {
									filteredData.nodes[fromNode].links = {};
								}

								// Only add forward direction link
								filteredData.nodes[fromNode].links[toNode] =
									true;

								// Also add to top-level links structure
								if (!filteredData.links[fromNode]) {
									filteredData.links[fromNode] = {};
								}

								filteredData.links[fromNode][toNode] = true;

								// Mark this link as added
								addedLinks.add(linkKey);

								console.log(
									`Added directional path link: ${fromNode} → ${toNode}`
								);
							}
						}
					});

					console.log(
						`Filtered data: ${
							Object.keys(filteredData.nodes).length
						} nodes, ${
							Object.keys(filteredData.links).length
						} link sources`
					);

					return filteredData;
				};

				// Force re-render
				instances.engine.render();
				console.log(
					"Path-only filter applied - showing only path nodes"
				);
			}
		} catch (error) {
			console.error("Error applying path-only filter:", error);
		}
	}

	private async highlightPathNodes(
		instances: GraphInstances,
		pathNodes: Set<string>,
		paths: string[][]
	): Promise<void> {
		try {
			console.log("Highlighting path nodes with strong colors...");

			// Wait for elements to be ready
			await new Promise((resolve) => setTimeout(resolve, 1000));

			if (instances.nodesSet?.extendedElementsMap) {
				let highlightedCount = 0;

				// Color code based on position in path
				const pathArray = Array.from(pathNodes);
				const firstPath = paths[0]; // Use first path for ordering

				for (const nodeId of pathNodes) {
					const extendedNode =
						instances.nodesSet.extendedElementsMap.get(nodeId);
					if (extendedNode) {
						try {
							// Highlight as search result (orange/yellow)
							if (
								typeof extendedNode.toggleIsSearchResult ===
								"function"
							) {
								extendedNode.toggleIsSearchResult(true);
							}

							// Try to set custom styling if possible
							const nodeElement = extendedNode.node;
							if (nodeElement) {
								// Make node more prominent
								nodeElement.style.stroke = "#ffff00"; // Yellow border
								nodeElement.style.strokeWidth = "4px";
								nodeElement.style.filter =
									"drop-shadow(0 0 10px #ffff00)"; // Glow effect

								// Color based on position in path
								const positionInPath =
									firstPath.indexOf(nodeId);
								if (positionInPath === 0) {
									// Start node - green
									nodeElement.style.fill = "#00ff00";
								} else if (
									positionInPath ===
									firstPath.length - 1
								) {
									// End node - red
									nodeElement.style.fill = "#ff0000";
								} else {
									// Intermediate nodes - blue
									nodeElement.style.fill = "#0088ff";
								}
							}

							highlightedCount++;
							console.log(`Enhanced highlighting for: ${nodeId}`);
						} catch (err) {
							console.warn(
								`Failed to enhance node ${nodeId}:`,
								err
							);
						}
					}
				}

				console.log(
					`Enhanced ${highlightedCount} path nodes with strong highlighting`
				);
			}
		} catch (error) {
			console.error("Error highlighting path nodes:", error);
		}
	}

	private async enhancePathLinks(
		instances: GraphInstances,
		paths: string[][]
	): Promise<void> {
		try {
			console.log("Enhancing path links visibility...");

			// Wait for links to be rendered
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Try to enhance link appearance
			if (instances.renderer && instances.renderer.links) {
				console.log("Found renderer links, enhancing...");

				// Collect all path edges
				const pathEdges = new Set<string>();
				paths.forEach((path) => {
					for (let i = 0; i < path.length - 1; i++) {
						const fromNode = path[i];
						const toNode = path[i + 1];
						// Create edge keys (both directions)
						pathEdges.add(`${fromNode}->${toNode}`);
						pathEdges.add(`${toNode}->${fromNode}`);
					}
				});

				// Try to access and modify link elements
				const linkElements = document.querySelectorAll(
					".graph-view svg line"
				);
				console.log(
					`Found ${linkElements.length} link elements to check`
				);

				linkElements.forEach((linkElement: any) => {
					try {
						// Try to identify if this is a path link and enhance it
						if (linkElement && linkElement.style) {
							// Make all visible links more prominent since we filtered to path only
							linkElement.style.stroke = "#ffaa00"; // Orange
							linkElement.style.strokeWidth = "3px";
							linkElement.style.opacity = "1.0";
							linkElement.style.filter =
								"drop-shadow(0 0 3px #ffaa00)";
						}
					} catch (err) {
						// Ignore individual link errors
					}
				});

				console.log("Enhanced link visibility");
			} else {
				console.log("Renderer links not available");
			}
		} catch (error) {
			console.error("Error enhancing path links:", error);
		}
	}

	private async focusOnPath(
		instances: GraphInstances,
		pathNodes: Set<string>
	): Promise<void> {
		try {
			console.log("Focusing view on path nodes...");

			// Try to zoom/pan to show path nodes prominently
			if (instances.renderer) {
				// Force render to ensure all changes are visible
				instances.renderer.changed();

				// Try to trigger layout update
				if (instances.engine) {
					instances.engine.render();
				}

				console.log("Focused view on path");
			}
		} catch (error) {
			console.error("Error focusing on path:", error);
		}
	}
}
