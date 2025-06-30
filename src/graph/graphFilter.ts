import { TFile } from "obsidian";
import { GraphColorAttributes, GraphData } from "obsidian-typings";
import { getFile, getFileInteractives, getOutlinkTypes, regExpFromString, TAG_KEY } from "src/internal";
import { GraphInstances, PluginInstances } from "src/pluginInstances";

interface GraphNodeData {
    type: string;
    links: Record<string, boolean>;
    color?: GraphColorAttributes;
}

export class GraphFilter {
    instances: GraphInstances;

    constructor(instances: GraphInstances) {
        this.instances = instances;
    }

    filterNodes(data: GraphData): GraphData {
        // Filter out nodes
        this.exludedAbstractFiles(data);
        this.filterByInteractives(data);

        let nodesToRemove: string[] = [];

        const potentialOrphans: string[] = [];
        let dataNodesEntries = Object.entries(data.nodes);
        for (const [source, node] of dataNodesEntries) {
            // @ts-ignore
            if (this.flagAsPotentialOrphan(node, source, potentialOrphans)) {
                continue;
            }

            const file = getFile(source);
            if (file) {
                // @ts-ignore
                if (this.filterByFolders(node, source, potentialOrphans)) {
                    continue;
                }

                // @ts-ignore
                this.filterByTypes(file, node, source, nodesToRemove);

                // @ts-ignore
                if (this.flagAsPotentialOrphan(node, source, potentialOrphans)) {
                    continue;
                }
            }

            // Actually remove source and targets
            for (const id of nodesToRemove) {
                delete data.nodes[id];
            }
            nodesToRemove = [];
        }

        data = this.filterOrphans(data, potentialOrphans);

        PluginInstances.graphsManager.updateStatusBarItem(this.instances.view.leaf, Object.keys(data.nodes).length);

        return data;
    }

    private exludedAbstractFiles(data: GraphData) {
        if (this.instances.settings.filterAbstractFiles.length === 0) return;

        const nodesToRemove: string[] = [];
        for (const [id, node] of Object.entries(data.nodes)) {
            for (const filter of this.instances.settings.filterAbstractFiles) {
                if (new RegExp(filter.regex, filter.flag).test(id)) {
                    nodesToRemove.push(id);
                    break;
                }
            }
        }

        for (const id of nodesToRemove) {
            delete data.nodes[id];
        }
    }

    private filterByInteractives(data: GraphData) {
        const nodesToRemove: string[] = [];
        if (!this.instances.settings.fadeOnDisable) {
            for (const [id, node] of Object.entries(data.nodes)) {
                // Remove file nodes
                const file = getFile(id);
                if (file) {
                    for (const [key, manager] of this.instances.nodesSet.managers) {
                        const interactives = getFileInteractives(key, file);
                        if (interactives.size === 0) {
                            interactives.add(this.instances.settings.interactiveSettings[key].noneType);
                        }
                        if (interactives.size > 0 && !manager.isActiveBasedOnTypes([...interactives])) {
                            nodesToRemove.push(id);
                        }
                    }
                }

                // Remove tag nodes
                else if (node.type === 'tag' && this.instances.settings.enableFeatures[this.instances.type]['tags']) {
                    const manager = this.instances.interactiveManagers.get(TAG_KEY);
                    if (manager && !manager.isActiveBasedOnTypes([id.replace('#', '')])) {
                        nodesToRemove.push(id);
                    }
                }
            }
        }
        for (const id of nodesToRemove) {
            delete data.nodes[id];
        }
    }

    private filterOrphans(data: GraphData, potentialOrphans: string[]): GraphData {
        // Filter existing orphans
        if (!this.instances.engine.options.showOrphans) {
            const remainingNodes = Object.values(data.nodes);
            for (const source of potentialOrphans) {
                // @ts-ignore
                if (!remainingNodes.find(n => source in n.links)) {
                    delete data.nodes[source];
                }
            }
        }

        // Filter non-existing orphans or tags
        const remainingNodes = Object.values(data.nodes);
        const invalidOrphans = Object.entries(data.nodes)
            .filter(([id, node]) =>
                (node.type === 'unresolved' || node.type === 'tag')
                // @ts-ignore
                && !remainingNodes.find(m => id in m.links)
            );
        for (const orphan of invalidOrphans) {
            delete data.nodes[orphan[0]];
        }

        return data;
    }

    private filterByFolders(node: GraphNodeData, source: string, potentialOrphans: string[]): boolean {
        const matchFolder = (file: string, folder: string): boolean => {
            return regExpFromString(folder)?.test(file) ?? file.startsWith(folder);
        };

        // Filter out based on source folders
        if (this.instances.settings.enableFeatures[this.instances.type]['links']
            && this.instances.settings.excludedSourcesFolder.find(folder => matchFolder(source, folder))) {
            node.links = {};
            return true;
        }

        // Filter out based on target folders
        const targets = Object.keys(node.links);
        for (const target of targets) {
            if (this.instances.settings.enableFeatures[this.instances.type]['links']
                && this.instances.settings.excludedTargetsFolder.find(folder => matchFolder(target, folder))) {
                delete node.links[target];
            }
        }

        if (Object.keys(node.links).length === 0) {
            if (!this.instances.engine.options.showOrphans) {
                potentialOrphans.push(source);
            }
            return true;
        }

        return false;
    }

    private filterByTypes(file: TFile, node: GraphNodeData, source: string, nodesToRemove: string[]) {
        for (const [key, manager] of this.instances.linksSet.managers) {
            const typedLinks = getOutlinkTypes(this.instances.settings, file); // id -> types
            const validTypedLinks = new Map([...typedLinks.entries()].reduce((acc: [string, Set<string>][], curr: [string, Set<string>]) => {
                curr[1] = new Set([...curr[1]].filter(type => manager.getTypes().includes(type)));
                if (curr[1].size > 0) {
                    acc.push(curr);
                }
                return acc;
            }, []));

            for (const [target, types] of validTypedLinks) {
                if (!(target in node.links)) continue;

                if (types.size > 0 && !manager.isActiveBasedOnTypes([...types])) {
                    // We can remove directly from the record since we are not iterating over the record
                    delete node.links[target];

                    // Remove source or target if settings enabled
                    if (this.instances.settings.disableSource) {
                        nodesToRemove.push(source);
                    }
                    if (this.instances.settings.disableTarget) {
                        nodesToRemove.push(target);
                    }
                }
            }

            if (!manager.isActiveBasedOnTypes([this.instances.settings.interactiveSettings[manager.name].noneType])) {
                const noneTargets = Object.keys(node.links).filter(target => !validTypedLinks.has(target));
                for (const target of noneTargets) {
                    // @ts-ignore
                    delete node.links[target];
                }
            }
        }
    }

    private flagAsPotentialOrphan(node: GraphNodeData, source: string, potentialOrphans: string[]): boolean {
        if (Object.keys(node.links).length === 0) {
            if (!this.instances.engine.options.showOrphans) {
                potentialOrphans.push(source);
            }
            return true;
        }
        return false;
    }
}
