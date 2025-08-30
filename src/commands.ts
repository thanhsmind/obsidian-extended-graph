import { GraphView, LocalGraphView } from "obsidian-typings";
import {
	Pinner,
	ExtendedGraphInstances,
	t,
	FindPathModal,
	Pathfinder,
} from "./internal";
import ExtendedGraphPlugin from "./main";
import { ItemView, Notice } from "obsidian";

function getActiveGraphView(
	plugin: ExtendedGraphPlugin
): GraphView | LocalGraphView | undefined {
	const itemView = plugin.app.workspace.getActiveViewOfType(ItemView);
	if (
		itemView &&
		(itemView.getViewType() === "graph" ||
			itemView.getViewType() === "localgraph")
	) {
		return itemView as GraphView | LocalGraphView;
	}
}

export function addCommands(plugin: ExtendedGraphPlugin) {
	addEnableCommands(plugin);
	addSVGCommands(plugin);
	addStateCommands(plugin);
	addFolderCommands(plugin);
	addPinCommands(plugin);
	addSelectCommands(plugin);
	addFocusCommands(plugin);
	addPathfinderCommands(plugin);
}

function addEnableCommands(plugin: ExtendedGraphPlugin) {
	plugin.addCommand({
		id: "enable-in-graph-view",
		name: t("controls.enableInGraphView"),
		checkCallback: (checking: boolean) => {
			const graphView = getActiveGraphView(plugin);
			if (
				graphView &&
				!ExtendedGraphInstances.graphsManager.isPluginAlreadyEnabled(
					graphView
				)
			) {
				if (!checking) {
					ExtendedGraphInstances.graphsManager.enablePlugin(
						graphView
					);
				}
				return true;
			}
		},
	});

	plugin.addCommand({
		id: "disable-in-graph-view",
		name: t("controls.disableInGraphView"),
		checkCallback: (checking: boolean) => {
			const graphView = getActiveGraphView(plugin);
			if (
				graphView &&
				ExtendedGraphInstances.graphsManager.isPluginAlreadyEnabled(
					graphView
				)
			) {
				if (!checking) {
					ExtendedGraphInstances.graphsManager.disablePlugin(
						graphView
					);
				}
				return true;
			}
		},
	});

	plugin.addCommand({
		id: "reset-in-graph-view",
		name: t("controls.resetInGraphView"),
		checkCallback: (checking: boolean) => {
			// Conditions to check
			const graphView = getActiveGraphView(plugin);
			if (
				graphView &&
				ExtendedGraphInstances.graphsManager.isPluginAlreadyEnabled(
					graphView
				)
			) {
				if (!checking) {
					ExtendedGraphInstances.graphsManager.resetPlugin(graphView);
				}
				return true;
			}
		},
	});
}

function addSVGCommands(plugin: ExtendedGraphPlugin) {
	plugin.addCommand({
		id: "copy-svg-screenshot",
		name: t("features.svgScreenshotCopy"),
		checkCallback: (checking: boolean) => {
			// Conditions to check
			const graphView = getActiveGraphView(plugin);
			if (graphView) {
				if (!checking) {
					ExtendedGraphInstances.graphsManager.getSVGScreenshot(
						graphView
					);
				}
				return true;
			}
		},
	});
}

function addStateCommands(plugin: ExtendedGraphPlugin) {
	plugin.addCommand({
		id: "save-for-default-state",
		name: t("states.saveForDefaultState"),
		checkCallback: (checking: boolean) => {
			// Conditions to check
			const graphView = getActiveGraphView(plugin);
			if (graphView) {
				if (!checking) {
					ExtendedGraphInstances.statesManager.saveForDefaultState(
						graphView
					);
				}
				return true;
			}
		},
	});

	plugin.addCommand({
		id: "save-for-normal-state",
		name:
			t("states.saveForNormalState") +
			" " +
			t("states.saveForNormalStateDesc"),
		checkCallback: (checking: boolean) => {
			// Conditions to check
			const graphView = getActiveGraphView(plugin);
			if (
				graphView &&
				ExtendedGraphInstances.graphsManager.isPluginAlreadyEnabled(
					graphView
				)
			) {
				if (!checking) {
					ExtendedGraphInstances.statesManager.saveForNormalState(
						graphView
					);
				}
				return true;
			}
		},
	});

	plugin.addCommand({
		id: "show-graph-state",
		name: t("states.showGraphState"),
		checkCallback: (checking: boolean) => {
			// Conditions to check
			const graphView = getActiveGraphView(plugin);
			if (
				graphView &&
				ExtendedGraphInstances.graphsManager.isPluginAlreadyEnabled(
					graphView
				)
			) {
				if (!checking) {
					ExtendedGraphInstances.statesManager.showGraphState(
						graphView
					);
				}
				return true;
			}
		},
	});
}

function addFolderCommands(plugin: ExtendedGraphPlugin) {
	plugin.addCommand({
		id: "enable-all-folders",
		name: `${t("plugin.folders")}: ${t("controls.showAll")}`,
		checkCallback: (checking: boolean) => {
			// Conditions to check
			const graphView = getActiveGraphView(plugin);
			if (
				graphView &&
				ExtendedGraphInstances.graphsManager.isPluginAlreadyEnabled(
					graphView
				)
			) {
				if (!checking) {
					const instances =
						ExtendedGraphInstances.graphsManager.allInstances.get(
							graphView.leaf.id
						);
					instances?.foldersSet?.enableAll();
				}
				return true;
			}
		},
	});

	plugin.addCommand({
		id: "enable-more-than-one-node-folders",
		name: `${t("plugin.folders")}: ${t("controls.showAll")} (${t(
			"controls.toggleAllWithMoreThanOneNode"
		)})`,
		checkCallback: (checking: boolean) => {
			// Conditions to check
			const graphView = getActiveGraphView(plugin);
			if (
				graphView &&
				ExtendedGraphInstances.graphsManager.isPluginAlreadyEnabled(
					graphView
				)
			) {
				if (!checking) {
					const instances =
						ExtendedGraphInstances.graphsManager.allInstances.get(
							graphView.leaf.id
						);
					instances?.foldersSet?.enableAllWithAtLeastOneNode();
				}
				return true;
			}
		},
	});

	plugin.addCommand({
		id: "disable-all-folders",
		name: `${t("plugin.folders")}: ${t("controls.hideAll")}`,
		checkCallback: (checking: boolean) => {
			// Conditions to check
			const graphView = getActiveGraphView(plugin);
			if (
				graphView &&
				ExtendedGraphInstances.graphsManager.isPluginAlreadyEnabled(
					graphView
				)
			) {
				if (!checking) {
					const instances =
						ExtendedGraphInstances.graphsManager.allInstances.get(
							graphView.leaf.id
						);
					instances?.foldersSet?.disableAll();
				}
				return true;
			}
		},
	});

	plugin.addCommand({
		id: "disable-more-than-one-node-folders",
		name: `${t("plugin.folders")}: ${t("controls.hideAll")} (${t(
			"controls.toggleAllWithMoreThanOneNode"
		)})`,
		checkCallback: (checking: boolean) => {
			// Conditions to check
			const graphView = getActiveGraphView(plugin);
			if (
				graphView &&
				ExtendedGraphInstances.graphsManager.isPluginAlreadyEnabled(
					graphView
				)
			) {
				if (!checking) {
					const instances =
						ExtendedGraphInstances.graphsManager.allInstances.get(
							graphView.leaf.id
						);
					instances?.foldersSet?.disableAllWithAtLeastOneNode();
				}
				return true;
			}
		},
	});
}

function addPinCommands(plugin: ExtendedGraphPlugin) {
	plugin.addCommand({
		id: "pin-selected-nodes",
		name: t("features.pinSelectedNodes"),
		checkCallback: (checking: boolean) => {
			// Conditions to check
			const graphView = getActiveGraphView(plugin);
			if (
				graphView &&
				ExtendedGraphInstances.graphsManager.isPluginAlreadyEnabled(
					graphView
				)
			) {
				const instances =
					ExtendedGraphInstances.graphsManager.allInstances.get(
						graphView.leaf.id
					);
				if (
					!instances ||
					Object.keys(instances.nodesSet.selectedNodes).length === 0
				) {
					return;
				}
				if (!checking) {
					instances.nodesSet.pinSelectedNodes();
				}
				return true;
			}
		},
	});

	plugin.addCommand({
		id: "unpin-selected-nodes",
		name: t("features.unpinSelectedNodes"),
		checkCallback: (checking: boolean) => {
			// Conditions to check
			const graphView = getActiveGraphView(plugin);
			if (
				graphView &&
				ExtendedGraphInstances.graphsManager.isPluginAlreadyEnabled(
					graphView
				)
			) {
				const instances =
					ExtendedGraphInstances.graphsManager.allInstances.get(
						graphView.leaf.id
					);
				if (
					!instances ||
					Object.keys(instances.nodesSet.selectedNodes).length === 0
				) {
					return;
				}
				if (
					Object.keys(instances.nodesSet.selectedNodes).every(
						(id) => !instances.nodesSet.isNodePinned(id)
					)
				) {
					return;
				}
				if (!checking) {
					instances.nodesSet.unpinSelectedNodes();
				}
				return true;
			}
		},
	});

	plugin.addCommand({
		id: "unpin-all-nodes",
		name: t("features.unpinAllNodes"),
		checkCallback: (checking: boolean) => {
			// Conditions to check
			const graphView = getActiveGraphView(plugin);
			if (
				graphView &&
				ExtendedGraphInstances.graphsManager.isPluginAlreadyEnabled(
					graphView
				)
			) {
				if (!checking) {
					const instances =
						ExtendedGraphInstances.graphsManager.allInstances.get(
							graphView.leaf.id
						);
					if (instances) {
						new Pinner(instances).unpinAllNodes();
					}
				}
				return true;
			}
		},
	});
}

function addSelectCommands(plugin: ExtendedGraphPlugin) {
	plugin.addCommand({
		id: "select-all-nodes",
		name: t("controls.selectAllNodes"),
		checkCallback: (checking: boolean) => {
			// Conditions to check
			const graphView = getActiveGraphView(plugin);
			if (
				graphView &&
				ExtendedGraphInstances.graphsManager.isPluginAlreadyEnabled(
					graphView
				)
			) {
				const instances =
					ExtendedGraphInstances.graphsManager.allInstances.get(
						graphView.leaf.id
					);
				if (!instances) {
					return;
				}
				if (!checking) {
					instances.nodesSet.selectNodes(instances.renderer.nodes);
					instances.renderer.changed();
				}
				return true;
			}
		},
	});

	plugin.addCommand({
		id: "invert-selection",
		name: t("controls.selectInvert"),
		checkCallback: (checking: boolean) => {
			// Conditions to check
			const graphView = getActiveGraphView(plugin);
			if (
				graphView &&
				ExtendedGraphInstances.graphsManager.isPluginAlreadyEnabled(
					graphView
				)
			) {
				const instances =
					ExtendedGraphInstances.graphsManager.allInstances.get(
						graphView.leaf.id
					);
				if (
					!instances ||
					Object.keys(instances.nodesSet.selectedNodes).length === 0
				) {
					return;
				}
				if (!checking) {
					instances.nodesSet.invertSelection();
					instances.renderer.changed();
				}
				return true;
			}
		},
	});
}

function addFocusCommands(plugin: ExtendedGraphPlugin) {
	plugin.addCommand({
		id: "flicker-open-nodes",
		name: t("features.focusFlickerOpenNodes"),
		checkCallback: (checking: boolean) => {
			// Conditions to check
			if (
				ExtendedGraphInstances.graphsManager.allInstances.size > 0 &&
				ExtendedGraphInstances.graphsManager.openNodes.length > 0
			) {
				if (!checking) {
					for (const instances of ExtendedGraphInstances.graphsManager.allInstances.values()) {
						for (const id of ExtendedGraphInstances.graphsManager
							.openNodes) {
							instances.nodesSet.extendedElementsMap
								.get(id)
								?.flicker();
						}
					}
				}
				return true;
			}
		},
	});

	plugin.addCommand({
		id: "flicker-search-nodes",
		name: t("features.focusFlickerSearchNodes"),
		checkCallback: (checking: boolean) => {
			// Conditions to check
			const searchResults =
				ExtendedGraphInstances.graphsManager.getSearchResults();
			if (
				ExtendedGraphInstances.graphsManager.allInstances.size > 0 &&
				searchResults.length > 0
			) {
				if (!checking) {
					for (const instances of ExtendedGraphInstances.graphsManager.allInstances.values()) {
						for (const id of searchResults) {
							instances.nodesSet.extendedElementsMap
								.get(id)
								?.flicker();
						}
					}
				}
				return true;
			}
		},
	});
}
function addPathfinderCommands(plugin: ExtendedGraphPlugin) {
	plugin.addCommand({
		id: "find-path-between-nodes",
		name: t("features.findPathBetweenNodes"),
		callback: () => {
			// Just open the modal - don't create graph view yet
			new FindPathModal(
				plugin.app,
				async (startNotePath, endNotePath) => {
					// Only create/setup graph view when user actually submits
					await setupGraphViewAndRunPathfinder(
						plugin,
						startNotePath,
						endNotePath
					);
				}
			).open();
		},
	});
}

async function setupGraphViewAndRunPathfinder(
	plugin: ExtendedGraphPlugin,
	startNotePath: string,
	endNotePath: string
) {
	try {
		console.log("Running pathfinder without creating graph view first...");

		// Create a dummy pathfinder instance - it will create its own graph view
		// We don't need any existing instances since pathfinder builds its own global graph
		const dummyInstances = {
			app: plugin.app,
		} as any; // Using any for simplicity since pathfinder will build its own graph

		// Run the pathfinder - it will create its own dedicated tab
		try {
			const pathfinder = new Pathfinder(dummyInstances);
			await pathfinder.findAndShowPaths(startNotePath, endNotePath);

			// Show success message
			const startFile = startNotePath.split("/").pop();
			const endFile = endNotePath.split("/").pop();
			new Notice(
				`Path found! Opened new tab showing: ${startFile} → ${endFile}`
			);
		} catch (pathfinderError) {
			console.error("Pathfinder error:", pathfinderError);
			// Try to show a user-friendly error message
			new Notice(`Failed to find path: ${pathfinderError.message}`);
		}
	} catch (error) {
		console.error(
			`Error setting up graph view for pathfinder (${startNotePath} -> ${endNotePath}):`,
			error
		);
		new Notice("Failed to setup graph view for path finding");
	}
}
