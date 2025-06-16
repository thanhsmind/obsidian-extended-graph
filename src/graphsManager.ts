import {
    CachedMetadata,
    Component,
    FileView,
    MarkdownView,
    Menu,
    Plugin,
    setIcon,
    TAbstractFile,
    TFile,
    TFolder,
    View,
    WorkspaceLeaf
} from "obsidian";
import {
    GraphData,
    GraphPluginInstance,
    GraphPluginInstanceOptions,
    GraphView,
    LocalGraphView
} from "obsidian-typings";
import {
    ExportCoreGraphToSVG,
    ExportExtendedGraphToSVG,
    ExportGraphToSVG,
    getEngine,
    GraphControlsUI,
    GraphEventsDispatcher,
    MenuUI,
    NodeStatCalculator,
    NodeStatCalculatorFactory,
    LinkStatCalculator,
    linkStatFunctionNeedsNLP,
    PluginInstances,
    GraphInstances,
    WorkspaceExt,
    getFileInteractives,
    ExtendedGraphFileNode,
    getOutlinkTypes,
    LINK_KEY,
    getLinkID,
    FOLDER_KEY,
    ExtendedGraphNode,
    ExtendedGraphLink,
    getGraphView,
    Pinner,
    isGraphBannerView,
    getGraphBannerPlugin,
    getGraphBannerClass,
    nodeStatFunctionLabels,
    linkStatFunctionLabels,
    GraphType,
    GraphStateModal,
    LinksStatCalculatorFactory,
    linkStatFunctionNeedsGraphAnalysis,
    LinkStat,
    SettingQuery
} from "./internal";
import STRINGS from "./Strings";



export class GraphsManager extends Component {
    globalUIs = new Map<string, { menu: MenuUI, control: GraphControlsUI }>();
    optionsBackup = new Map<string, GraphPluginInstanceOptions>();
    allInstances = new Map<string, GraphInstances>();
    activeFile: TFile | null = null;

    lastBackup: string;
    localGraphID: string | null = null;

    isHandlingMarkdownViewChange: boolean = false;
    isResetting: boolean = false;

    statusBarItem: HTMLElement;

    nodesSizeCalculator: NodeStatCalculator | undefined;
    nodesColorCalculator: NodeStatCalculator | undefined;
    linksSizeCalculator: LinkStatCalculator | undefined;
    linksColorCalculator: LinkStatCalculator | undefined;

    // ============================== CONSTRUCTOR ==============================

    constructor() {
        super();
    }

    // ================================ LOADING ================================

    onload(): void {
        this.initiliazesNodeSizeCalculator();
        this.initializeNodesColorCalculator();
        this.initializeLinksSizeCalculator();
        this.initializeLinksColorCalculator();
        this.addStatusBarItem();
        this.registerEvents();
    }

    private registerEvents() {
        this.onMetadataCacheChange = this.onMetadataCacheChange.bind(this);
        this.registerEvent(PluginInstances.app.metadataCache.on('changed', (file, data, cache) => {
            if (!this.isCoreGraphLoaded()) return;
            this.onMetadataCacheChange(file, data, cache)
        }));

        this.onDelete = this.onDelete.bind(this);
        this.registerEvent(PluginInstances.app.vault.on('delete', (file) => {
            if (!this.isCoreGraphLoaded()) return;
            this.onDelete(file);
        }));

        this.onRename = this.onRename.bind(this);
        this.registerEvent(PluginInstances.app.vault.on('rename', (file, oldPath) => {
            if (!this.isCoreGraphLoaded()) return;
            this.onRename(file, oldPath);
        }));

        this.onCSSChange = this.onCSSChange.bind(this);
        this.registerEvent(PluginInstances.app.workspace.on('css-change', () => {
            if (!this.isCoreGraphLoaded()) return;
            this.onCSSChange();
        }));

        this.registerEvent(PluginInstances.app.workspace.on('layout-change', () => {
            if (!this.isCoreGraphLoaded()) return;
            PluginInstances.plugin.onLayoutChange();
        }));

        this.onActiveLeafChange = this.onActiveLeafChange.bind(this);
        this.registerEvent(PluginInstances.app.workspace.on('active-leaf-change', (leaf) => {
            if (!this.isCoreGraphLoaded()) return;
            this.onActiveLeafChange(leaf);
        }));

        this.onFileOpen = this.onFileOpen.bind(this);
        this.registerEvent(PluginInstances.app.workspace.on('file-open', (file) => {
            if (!this.isCoreGraphLoaded()) return;
            this.onFileOpen(file);
        }));

        this.updatePaletteForInteractive = this.updatePaletteForInteractive.bind(this);
        this.registerEvent((PluginInstances.app.workspace as WorkspaceExt).on('extended-graph:settings-colorpalette-changed', (key: string) => {
            if (!this.isCoreGraphLoaded()) return;
            this.updatePaletteForInteractive(key);
        }));

        this.updateColorForInteractiveType = this.updateColorForInteractiveType.bind(this);
        this.registerEvent((PluginInstances.app.workspace as WorkspaceExt).on('extended-graph:settings-interactive-color-changed', (key: string, type: string) => {
            if (!this.isCoreGraphLoaded()) return;
            this.updateColorForInteractiveType(key, type);
        }));

        this.onNodeMenuOpened = this.onNodeMenuOpened.bind(this);
        this.registerEvent(PluginInstances.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile, source: string, leaf?: WorkspaceLeaf) => {
            if (!this.isCoreGraphLoaded()) return;
            this.onNodeMenuOpened(menu, file, source, leaf);
        }));
    }

    private addStatusBarItem(): void {
        this.statusBarItem = PluginInstances.plugin.addStatusBarItem();
        this.statusBarItem.addClasses(['plugin-extended-graph']);
    }

    private isCoreGraphLoaded(): boolean {
        return !!PluginInstances.app.internalPlugins.getPluginById("graph")?._loaded;
    }

    private initiliazesNodeSizeCalculator(): void {
        try {
            this.nodesSizeCalculator = NodeStatCalculatorFactory.getCalculator('size');
        } catch (error) {
            console.error(error);
            PluginInstances.settings.nodesSizeFunction = 'default';
            PluginInstances.plugin.saveSettings();
            new Notice(`${STRINGS.notices.nodeStatSizeFailed} (${nodeStatFunctionLabels[PluginInstances.settings.nodesSizeFunction]}). ${STRINGS.notices.functionToDefault}`);
            this.nodesSizeCalculator = undefined;
        }
        this.nodesSizeCalculator?.computeStats(PluginInstances.settings.invertNodeStats);
    }

    private initializeNodesColorCalculator(): void {
        try {
            this.nodesColorCalculator = NodeStatCalculatorFactory.getCalculator('color');
        } catch (error) {
            console.error(error);
            PluginInstances.settings.nodesColorFunction = 'default';
            PluginInstances.plugin.saveSettings();
            new Notice(`${STRINGS.notices.nodeStatColorFailed} (${nodeStatFunctionLabels[PluginInstances.settings.nodesColorFunction]}). ${STRINGS.notices.functionToDefault}`);
            this.nodesColorCalculator = undefined;
        }
        this.nodesColorCalculator?.computeStats(PluginInstances.settings.invertNodeStats);
    }

    private initializeLinksSizeCalculator(): void {
        try {
            if (this.canUseLinkStatFunction('size')) {
                this.linksSizeCalculator = LinksStatCalculatorFactory.getCalculator('size');
            }
        } catch (error) {
            console.error(error);
            PluginInstances.settings.linksSizeFunction = 'default';
            PluginInstances.plugin.saveSettings();
            new Notice(`${STRINGS.notices.linkStatSizeFailed} (${linkStatFunctionLabels[PluginInstances.settings.linksSizeFunction]}). ${STRINGS.notices.functionToDefault}`);
            this.linksSizeCalculator = undefined;
        }
        this.linksSizeCalculator?.computeStats(PluginInstances.settings.linksSizeFunction);
    }

    private initializeLinksColorCalculator(): void {
        try {
            if (this.canUseLinkStatFunction('color')) {
                this.linksColorCalculator = LinksStatCalculatorFactory.getCalculator('color');
            }
        } catch (error) {
            console.error(error);
            PluginInstances.settings.linksColorFunction = 'default';
            PluginInstances.plugin.saveSettings();
            new Notice(`${STRINGS.notices.linkStatColorFailed} (${linkStatFunctionLabels[PluginInstances.settings.linksColorFunction]}). ${STRINGS.notices.functionToDefault}`);
            this.linksColorCalculator = undefined;
        }
        this.linksColorCalculator?.computeStats(PluginInstances.settings.linksColorFunction);
    }

    private canUseLinkStatFunction(stat: LinkStat): boolean {
        const ga = this.getGraphAnalysis();
        const fn = stat === 'color' ? PluginInstances.settings.linksColorFunction : PluginInstances.settings.linksSizeFunction;

        if (!ga["graph-analysis"] && linkStatFunctionNeedsGraphAnalysis[fn]) {
            if (stat === 'color') {
                this.linksColorCalculator = undefined;
            }
            else {
                this.linksSizeCalculator = undefined;
            }
            return false;
        }

        if (!ga.nlp && linkStatFunctionNeedsNLP[fn]) {
            new Notice(`${STRINGS.notices.nlpPluginRequired} (${fn})`);
            if (stat === 'color') {
                this.linksColorCalculator = undefined;
                PluginInstances.settings.linksColorFunction = 'default';
            }
            else {
                this.linksSizeCalculator = undefined;
                PluginInstances.settings.linksSizeFunction = 'default';
            }
            PluginInstances.plugin.saveSettings();
            return false;
        }
        return true;
    }

    // =============================== UNLOADING ===============================

    // ============================= THEME CHANGE ==============================

    private onCSSChange() {
        for (const instances of this.allInstances.values()) {
            instances.dispatcher.onCSSChange();
        }
    }

    // ============================ METADATA CHANGES ===========================

    /**
     * Called when a file has been indexed, and its (updated) cache is now available.
     * @param file - The updated TFile
     * @param data - The new content of the markdown file
     * @param cache - The new cached metadata
     */
    private onMetadataCacheChange(file: TFile, data: string, cache: CachedMetadata) {
        for (const instances of this.allInstances.values()) {
            if (!instances.graph || !instances.renderer) return;

            // Update nodes interactives
            const extendedNode = instances.nodesSet.extendedElementsMap.get(file.path) as ExtendedGraphFileNode;
            if (!extendedNode) return;
            for (const [key, manager] of instances.nodesSet.managers) {
                let newTypes = [...getFileInteractives(key, file)];
                newTypes = newTypes.filter(type => !SettingQuery.excludeType(PluginInstances.settings, key, type));
                if (newTypes.length === 0) {
                    newTypes.push(instances.settings.interactiveSettings[key].noneType);
                }
                const { typesToRemove: typesToRemoveForTheNode, typesToAdd: typesToAddForTheNode } = extendedNode.matchesTypes(key, [...newTypes]);
                for (const type of typesToRemoveForTheNode) {
                    instances.nodesSet.typesMap[key][type].delete(extendedNode.id);
                }
                for (const type of typesToAddForTheNode) {
                    if (!instances.nodesSet.typesMap[key][type]) instances.nodesSet.typesMap[key][type] = new Set<string>();
                    instances.nodesSet.typesMap[key][type].add(extendedNode.id);
                }
                extendedNode.setTypes(key, new Set<string>(newTypes));

                const typesToRemove = typesToRemoveForTheNode.filter(type => instances.nodesSet.typesMap[key][type].size === 0);
                if (typesToRemove.length > 0) {
                    manager.removeTypes(typesToRemove);
                }
                const managersTypes = manager.getTypes();
                const typesToAdd = typesToAddForTheNode.filter(type => {
                    return !managersTypes.includes(type);
                })
                if (typesToAdd.length > 0) {
                    manager.addTypes(typesToAdd);
                }

                if (typesToRemove.length === 0 && typesToAdd.length === 0 && (typesToRemoveForTheNode.length > 0 || typesToAddForTheNode.length > 0)) {
                    extendedNode.graphicsWrapper.resetManagerGraphics(manager);
                }
            }

            // Update links interactives
            let newOutlinkTypes = getOutlinkTypes(instances.settings, file);
            const linkManager = instances.linksSet.managers.get(LINK_KEY);
            if (!linkManager) return;
            for (let [targetID, newTypes] of newOutlinkTypes) {
                const extendedLink = instances.linksSet.extendedElementsMap.get(getLinkID({ source: { id: file.path }, target: { id: targetID } }));
                if (!extendedLink) continue;
                newTypes = new Set<string>([...newTypes].filter(type => !SettingQuery.excludeType(PluginInstances.settings, LINK_KEY, type)));
                if (newTypes.size === 0) {
                    newTypes.add(instances.settings.interactiveSettings[LINK_KEY].noneType);
                }
                const { typesToRemove: typesToRemoveForTheLink, typesToAdd: typesToAddForTheLink } = extendedLink.matchesTypes(LINK_KEY, [...newTypes]);
                for (const type of typesToRemoveForTheLink) {
                    instances.linksSet.typesMap[LINK_KEY][type].delete(extendedLink.id);
                }
                for (const type of typesToAddForTheLink) {
                    if (!instances.linksSet.typesMap[LINK_KEY][type]) instances.linksSet.typesMap[LINK_KEY][type] = new Set<string>();
                    instances.linksSet.typesMap[LINK_KEY][type].add(extendedLink.id);
                }
                extendedLink.setTypes(LINK_KEY, new Set<string>(newTypes));

                const typesToRemove = typesToRemoveForTheLink.filter(type => {
                    return instances.nodesSet.typesMap[LINK_KEY][type].size === 0
                });
                if (typesToRemove.length > 0) {
                    linkManager.removeTypes(typesToRemove);
                }
                const managersTypes = linkManager.getTypes();
                const typesToAdd = typesToAddForTheLink.filter(type => {
                    return !managersTypes.includes(type);
                });
                if (typesToAdd.length > 0) {
                    linkManager.addTypes(typesToAdd);
                }
                if (typesToRemove.length === 0 && typesToAdd.length === 0 && (typesToRemoveForTheLink.length > 0 || typesToAddForTheLink.length > 0)) {
                    extendedLink.graphicsWrapper?.resetManagerGraphics(linkManager);
                }
            }

            const extendedOutlinks = Array.from(instances.linksSet.extendedElementsMap.values()).filter(
                link => link.coreElement.source.id === file.path
            );
            const idsToRemove: string[] = [];
            for (const extendedOutlink of extendedOutlinks) {
                if (!newOutlinkTypes.has(extendedOutlink.coreElement.target.id)) {
                    extendedOutlink.graphicsWrapper?.disconnect();
                    idsToRemove.push(extendedOutlink.id);
                }
            }
            for (const id of idsToRemove) {
                instances.linksSet.extendedElementsMap.delete(id);
            }
        }
    }

    private onDelete(file: TAbstractFile) {
        const id = file.path;
        if (file instanceof TFile) {
            for (const [leafID, instances] of this.allInstances) {
                const nodesSet = instances.nodesSet;
                const extendedNode = nodesSet.extendedElementsMap.get(id);
                if (!extendedNode) continue;

                for (const [key, manager] of nodesSet.managers) {
                    const types = extendedNode.getTypes(key);
                    const typesToRemove: string[] = [];
                    for (const type of types) {
                        nodesSet.typesMap[key][type].delete(id);
                        if (nodesSet.typesMap[key][type]?.size === 0) {
                            typesToRemove.push(type);
                        }
                    }
                    manager.removeTypes(typesToRemove);
                }

                nodesSet.extendedElementsMap.delete(id);
                nodesSet.connectedIDs.delete(id);
                extendedNode?.graphicsWrapper?.disconnect();
                extendedNode?.graphicsWrapper?.destroyGraphics();

                const linksSet = instances.linksSet;
                const extendedLinks = [...linksSet.extendedElementsMap.values()].filter(el => el.coreElement.source.id === id);
                for (const extendedLink of extendedLinks) {
                    const linkID = extendedLink.id;

                    const types = extendedLink.getTypes(LINK_KEY);
                    const typesToRemove: string[] = [];
                    for (const type of types) {
                        linksSet.typesMap[LINK_KEY][type].delete(linkID);
                        if (linksSet.typesMap[LINK_KEY][type]?.size === 0) {
                            typesToRemove.push(type);
                        }
                    }
                    linksSet.managers.get(LINK_KEY)?.removeTypes(typesToRemove);

                    linksSet.extendedElementsMap.delete(linkID);
                    linksSet.connectedIDs.delete(linkID);
                    extendedLink?.graphicsWrapper?.disconnect();
                    extendedLink?.graphicsWrapper?.destroyGraphics();

                }
            }
        }
        else if (file instanceof TFolder) {
            for (const [leafID, instances] of this.allInstances) {
                const foldersSet = instances.foldersSet;
                foldersSet?.managers.get(FOLDER_KEY)?.removeTypes([id]);
            }
        }
    }

    private onRename(file: TAbstractFile, oldPath: string) {
        const newPath = file.path;
        let predicate: (oldPath: string, currentPath: string) => boolean;

        if (file instanceof TFile) {
            predicate = function (oldPath: string, currentPath: string): boolean {
                return oldPath === currentPath;
            }
        }
        else {
            predicate = function (oldPath: string, currentPath: string): boolean {
                return currentPath.startsWith(oldPath + "/");
            }
        }

        for (const [leafID, instances] of this.allInstances) {
            // Type maps
            for (const [key, manager] of instances.nodesSet.managers) {
                instances.nodesSet.typesMap[key] = Object.fromEntries(
                    Object.entries(instances.nodesSet.typesMap[key]).map(([type, nodeIDs]) => {
                        return [type, new Set([...nodeIDs].filter(nodeID => !predicate(oldPath, nodeID)))];
                    })
                );
            }
            for (const [key, manager] of instances.linksSet.managers) {
                instances.linksSet.typesMap[key] = Object.fromEntries(
                    Object.entries(instances.linksSet.typesMap[key]).map(([type, linkIDs]) => {
                        return [type, new Set([...linkIDs].filter(linkID => {
                            const extendedLink = instances.linksSet.extendedElementsMap.get(linkID);
                            return extendedLink
                                && !predicate(oldPath, extendedLink.coreElement.source.id)
                                && !predicate(oldPath, extendedLink.coreElement.target.id);
                        }))];
                    })
                );
            }
            // Connected nodes ids
            instances.nodesSet.connectedIDs = new Set<string>(
                [...instances.nodesSet.connectedIDs].filter(id => {
                    return !predicate(oldPath, id);
                })
            );
            // Connected links ids
            instances.linksSet.connectedIDs = new Set<string>(
                [...instances.linksSet.connectedIDs].filter(linkID => {
                    const extendedLink = instances.linksSet.extendedElementsMap.get(linkID);
                    return extendedLink
                        && !predicate(oldPath, extendedLink.coreElement.source.id)
                        && !predicate(oldPath, extendedLink.coreElement.target.id);
                })
            );
            // Pinned nodes
            const pinner = new Pinner(instances);
            for (const [nodeID, extendedNode] of instances.nodesSet.extendedElementsMap) {
                if (extendedNode.isPinned && predicate(oldPath, nodeID)) {
                    pinner.pinNode(newPath, extendedNode.coreElement.x, extendedNode.coreElement.y);
                }
            }
            for (const state of PluginInstances.settings.states) {
                if (!state.pinNodes) break;
                const pinNodes = structuredClone(Object.entries(state.pinNodes));
                for (const [currentPath, pos] of pinNodes) {
                    if (predicate(oldPath, currentPath)) {
                        delete state.pinNodes[currentPath];
                        state.pinNodes[newPath] = pos;
                    }
                }
                PluginInstances.plugin.saveSettings();
            }
            // Extended nodes
            instances.nodesSet.extendedElementsMap = new Map<string, ExtendedGraphNode>(
                [...instances.nodesSet.extendedElementsMap].filter(([id, extendedNode]) => {
                    if (predicate(oldPath, id)) {
                        extendedNode.graphicsWrapper?.destroyGraphics();
                        extendedNode.graphicsWrapper?.disconnect();
                        extendedNode.coreElement.clearGraphics();
                        return false;
                    }
                    return true;
                })
            );
            // Extended links
            instances.linksSet.extendedElementsMap = new Map<string, ExtendedGraphLink>(
                [...instances.linksSet.extendedElementsMap].filter(([id, extendedLink]) => {
                    if (predicate(oldPath, extendedLink.coreElement.source.id) || predicate(oldPath, extendedLink.coreElement.target.id)) {
                        extendedLink.graphicsWrapper?.destroyGraphics();
                        extendedLink.graphicsWrapper?.disconnect();
                        extendedLink.coreElement.clearGraphics();
                        return false;
                    }
                    return true;
                })
            );
        }
    }

    // ================================ LAYOUT =================================

    onNewLeafOpen(leaf: WorkspaceLeaf): void {
        const view = getGraphView(leaf);
        if (!view) return;

        try {
            this.setGlobalUI(view);
        }
        catch (e) {
            // UI not set, probably because the graph is in a closed sidebar
            console.error("ERROR: could not set global UI.");
            console.error(e);
        }
        if (this.isPluginAlreadyEnabled(view)) return;

        if (!this.isGlobalGraphAlreadyOpened(view)) {
            this.backupOptions(view);
        }

        if (PluginInstances.settings.enableFeatures[view.getViewType()]['auto-enabled']) {
            this.enablePlugin(view, PluginInstances.settings.startingStateID);
        }
    }

    private isPluginAlreadyEnabled(view: GraphView | LocalGraphView): boolean {
        return this.allInstances.has(view.leaf.id);
    }

    private isGlobalGraphAlreadyOpened(view: GraphView | LocalGraphView): boolean {
        return this.optionsBackup.has(view.leaf.id) && view.getViewType() === "graph";
    }

    syncWithLeaves(leaves: WorkspaceLeaf[]): void {
        const currentActiveLeavesID = leaves.map(l => l.id);
        const localLeaf = leaves.find(l =>
            l.view.getViewType() === "localgraph"
            && (l.view instanceof View)
            && !isGraphBannerView(l.view as LocalGraphView));

        this.localGraphID = localLeaf ? localLeaf.id : null;

        // Remove dispatchers from closed leaves
        const allInstancesIDs = [...this.allInstances.keys()];
        for (const leafID of allInstancesIDs) {
            if (!currentActiveLeavesID.includes(leafID)) {
                this.disablePluginFromLeafID(leafID);
            }
        }
        // Remove options backups, but keep one
        const optionsBackupIDs = [...this.optionsBackup.keys()];
        for (const leafID of optionsBackupIDs) {
            if (!currentActiveLeavesID.includes(leafID) && this.lastBackup !== leafID) {
                this.optionsBackup.delete(leafID);
            }
        }
        // Remove UI from closed leaves
        const globalUIsIDs = [...this.globalUIs.keys()];
        for (const leafID of globalUIsIDs) {
            if (!currentActiveLeavesID.includes(leafID)) {
                this.globalUIs.delete(leafID);
            }
        }
    }

    // =============================== GLOBAL UI ===============================

    private setGlobalUI(view: GraphView | LocalGraphView): { menu: MenuUI, control: GraphControlsUI } {
        let globalUI = this.globalUIs.get(view.leaf.id);

        if (globalUI) return globalUI;

        const menuUI = new MenuUI(view);
        view.addChild(menuUI);

        const controlsUI = new GraphControlsUI(view);
        controlsUI.onPluginDisabled();
        view.addChild(controlsUI);

        globalUI = { menu: menuUI, control: controlsUI };
        this.globalUIs.set(view.leaf.id, globalUI);
        return globalUI;
    }

    // ================================ COLORS =================================

    updatePaletteForInteractive(interactive: string): void {
        this.allInstances.forEach(instance => {
            instance.interactiveManagers.get(interactive)?.recomputeColors();
        });
    }

    updateColorForInteractiveType(key: string, type: string): void {
        this.allInstances.forEach(instance => {
            instance.interactiveManagers.get(key)?.recomputeColor(type);
        });
    }

    // ================================= STATS =================================

    updateSizeFunctionForNodesStat(): void {
        for (const [leafID, instances] of this.allInstances) {
            instances.settings.nodesSizeFunction = PluginInstances.settings.nodesSizeFunction;
            instances.renderer.changed();
        }
    }

    updatePaletteForNodesStat(): void {
        for (const [leafID, instances] of this.allInstances) {
            instances.settings.nodesColorFunction = PluginInstances.settings.nodesColorFunction;
            instances.renderer.changed();
        }
    }

    updateSizeFunctionForLinksStat(): void {
        for (const [leafID, instances] of this.allInstances) {
            if (!instances.settings.curvedLinks) {
                for (const [id, extendedLink] of instances.linksSet.extendedElementsMap) {
                    extendedLink.changeCoreLinkThickness();
                }
            }
            instances.renderer.changed();
        }
    }

    updatePaletteForLinksStat(): void {
        for (const [leafID, instances] of this.allInstances) {
            for (const [id, extendedLink] of instances.linksSet.extendedElementsMap) {
                extendedLink.graphicsWrapper?.updateGraphics();
            }
            instances.renderer.changed();
        }
    }

    // ============================= ENABLE PLUGIN =============================

    enablePlugin(view: GraphView | LocalGraphView, stateID?: string): void {
        if (!this.isResetting) {
            this.backupOptions(view);
        }

        if (this.isPluginAlreadyEnabled(view)) return;
        if (this.isNodeLimitExceededForView(view)) return;

        if (!this.linksSizeCalculator) this.initializeLinksSizeCalculator();
        if (!this.linksColorCalculator) this.initializeLinksColorCalculator();
        const instances = this.addGraph(view, stateID ?? PluginInstances.settings.startingStateID);
        const globalUI = this.setGlobalUI(view);
        globalUI.menu.setEnableUIState();
        globalUI.control.onPluginEnabled(instances);
        this.updateStatusBarItem(view.leaf);
    }

    private addGraph(view: GraphView | LocalGraphView, stateID: string): GraphInstances {
        let instances = this.allInstances.get(view.leaf.id);
        if (instances) return instances;

        instances = new GraphInstances(view);
        instances.stateData = PluginInstances.statesManager.getStateDataById(stateID);
        new GraphEventsDispatcher(instances);
        if (stateID) {
            instances.statesUI.setValue(stateID);
        }

        this.allInstances.set(view.leaf.id, instances);
        instances.dispatcher.load();
        view.addChild(instances.dispatcher);

        if (view.getViewType() === "localgraph" && !isGraphBannerView(view)) {
            this.localGraphID = view.leaf.id;
        }

        return instances;
    }

    isNodeLimitExceededForView(view: GraphView | LocalGraphView): boolean {
        if (view.renderer.nodes.length > PluginInstances.settings.maxNodes) {
            new Notice(`${STRINGS.notices.nodeLimiteExceeded} (${view.renderer.nodes.length}). ${STRINGS.notices.nodeLimitIs} ${PluginInstances.settings.maxNodes}. ${STRINGS.notices.changeInSettings}.`);
            return true;
        }
        return false;
    }

    isNodeLimitExceededForData(data: GraphData, notice: boolean = true): boolean {
        if (Object.keys(data.nodes).length > PluginInstances.settings.maxNodes) {
            if (notice)
                new Notice(`${STRINGS.notices.nodeLimiteExceeded} (${Object.keys(data.nodes).length}). ${STRINGS.notices.nodeLimitIs} ${PluginInstances.settings.maxNodes}. ${STRINGS.plugin.name} ${STRINGS.notices.disabled}. ${STRINGS.notices.changeInSettings}.`);
            return true;
        }
        return false;
    }

    getGraphAnalysis(): { "graph-analysis": Plugin | null, "nlp": Plugin | null } {
        const ga = PluginInstances.app.plugins.getPlugin("graph-analysis");
        if (ga && ga._loaded) {
            let nlp = PluginInstances.app.plugins.getPlugin("nlp");
            return {
                "graph-analysis": ga,
                // @ts-ignore
                "nlp": nlp && nlp.settings?.refreshDocsOnLoad ? nlp : null
            };
        }
        else {
            return {
                "graph-analysis": null,
                "nlp": null
            };
        }
    }

    onPluginLoaded(view: GraphView | LocalGraphView): void {
        this.isResetting = false;
    }


    // ============================ DISABLE PLUGIN =============================

    disablePlugin(view: GraphView | LocalGraphView): void {
        this.disablePluginFromLeafID(view.leaf.id);
        if (!this.isResetting) {
            view.renderer.changed();
        }
    }

    disablePluginFromLeafID(leafID: string) {
        this.disableUI(leafID);
        this.unloadDispatcher(leafID);
    }

    private disableUI(leafID: string) {
        const globalUI = this.globalUIs.get(leafID);
        if (globalUI) {
            globalUI.menu.setDisableUIState();
            globalUI.control.onPluginDisabled();
        }
    }

    private unloadDispatcher(leafID: string) {
        const instances = this.allInstances.get(leafID);
        if (instances) {
            instances.dispatcher.unload();
        }
    }

    onPluginUnloaded(view: GraphView | LocalGraphView): void {
        this.allInstances.delete(view.leaf.id);

        if (this.localGraphID === view.leaf.id) this.localGraphID = null;

        if (!this.isResetting) {
            if (view._loaded) {
                this.applyNormalState(view);
            }
            this.restoreBackupInGraphJson();
        }

        this.updateStatusBarItem(view.leaf);
    }

    // ============================= RESET PLUGIN ==============================

    resetAllPlugins(graphtype: GraphType) {
        const views = [...this.allInstances.values()].filter(i => i.type === graphtype).map(i => i.view);
        for (const view of views) {
            this.resetPlugin(view);
        }
    }

    resetPlugin(view: GraphView | LocalGraphView): void {
        console.log("Start resetting");
        this.isResetting = true;
        const instances = this.allInstances.get(view.leaf.id);
        const stateID = instances?.statesUI.currentStateID;
        const scale = instances?.renderer.targetScale ?? false;
        this.disablePlugin(view);
        this.enablePlugin(view, stateID);
        const newDispatcher = this.allInstances.get(view.leaf.id);
        if (newDispatcher && scale) {
            newDispatcher.renderer.targetScale = scale;
        }
        //this.isResetting = false;
    }

    // ===================== CHANGE CURRENT MARKDOWN FILE ======================

    onActiveLeafChange(leaf: WorkspaceLeaf | null) {
        // Change the focus on active file
        if (leaf) {
            if (!this.isMarkdownLeaf(leaf)) {
                this.changeActiveFile((leaf.view as FileView).file);
            }
            else {
                this.changeActiveFile(null);
            }
        }

        // Change the number of nodes in the status bar
        this.updateStatusBarItem(leaf);
    }

    private isMarkdownLeaf(leaf: WorkspaceLeaf): boolean {
        return (leaf.view.getViewType() === "markdown") && (leaf.view instanceof FileView);
    }

    private onFileOpen(file: TFile | null): void {
        if (this.isHandlingMarkdownViewChange) return;
        this.isHandlingMarkdownViewChange = true;
        if (this.activeFile !== file) {
            this.changeActiveFile(file);
            if (this.localGraphID) {
                const localInstances = this.allInstances.get(this.localGraphID);
                if (localInstances) {
                    this.resetPlugin(localInstances.view);
                }
            }
            if (file) {
                const graphBannerPlugin = getGraphBannerPlugin();
                if (graphBannerPlugin) {
                    // If there is a Graph Banner plugin graph, center it on the correct node.
                    // It's not working perfectly, I think the Graph Banner plugin does its part after this piece of code,
                    // which means that nodes get a new position after the zooming.
                    const leaves = PluginInstances.app.workspace.getLeavesOfType('markdown').filter(leaf => leaf.view instanceof MarkdownView && (leaf.view as MarkdownView).file === file);
                    for (const leaf of leaves) {
                        if (!(leaf.view instanceof MarkdownView)) continue;
                        const view = leaf.view as MarkdownView;
                        const graphBannerView = getGraphBannerPlugin()?.graphViews.find(el => el.node === view.contentEl.querySelector(`.${getGraphBannerClass()}`))?.leaf.view;
                        if (graphBannerView && this.allInstances.get(graphBannerView.leaf.id)) {
                            const graphBannerViewTyped = graphBannerView as LocalGraphView;
                            this.zoomOnNode(graphBannerViewTyped, file.path, graphBannerViewTyped.renderer.targetScale);
                        }
                    }
                }
            }
        }
        this.isHandlingMarkdownViewChange = false;
    }

    changeActiveFile(file: TFile | null): void {
        if (!this.activeFile && !file) return;

        for (const instances of this.allInstances.values()) {
            if (!instances.settings.enableFeatures['graph']['focus']) continue;
            if (instances.type !== "graph") continue;
            this.deEmphasizePreviousActiveFile(instances);
            this.emphasizeActiveFile(instances, file);
            instances.renderer.changed();
        }

        this.activeFile = file;
    }

    private deEmphasizePreviousActiveFile(instances: GraphInstances) {
        if (this.activeFile) {
            instances.nodesSet.emphasizeNode(this.activeFile, false);
        }
    }

    private emphasizeActiveFile(instances: GraphInstances, file: TFile | null) {
        if (file) {
            instances.nodesSet.emphasizeNode(file, true);
        }
    }

    // ==================== HANDLE NORMAL AND DEFAULT STATE ====================

    backupOptions(view: GraphView | LocalGraphView) {
        const engine = getEngine(view);
        const options = structuredClone(engine.getOptions());
        this.optionsBackup.set(view.leaf.id, options);
        delete options.search;
        this.lastBackup = view.leaf.id;
        PluginInstances.settings.backupGraphOptions = options;
        PluginInstances.plugin.saveSettings();
    }

    restoreBackupInGraphJson() {
        const backup = this.optionsBackup.get(this.lastBackup);
        const corePluginInstance = this.getCorePluginInstance();
        if (corePluginInstance && backup) {
            corePluginInstance.options.colorGroups = backup.colorGroups;
            corePluginInstance.options.hideUnresolved = backup.hideUnresolved;
            corePluginInstance.options.showAttachments = backup.showAttachments;
            corePluginInstance.options.showOrphans = backup.showOrphans;
            corePluginInstance.options.showTags = backup.showTags;
            corePluginInstance.options.localBacklinks = backup.localBacklinks;
            corePluginInstance.options.localForelinks = backup.localForelinks;
            corePluginInstance.options.localInterlinks = backup.localInterlinks;
            corePluginInstance.options.localJumps = backup.localJumps;
            corePluginInstance.options.lineSizeMultiplier = backup.lineSizeMultiplier;
            corePluginInstance.options.nodeSizeMultiplier = backup.nodeSizeMultiplier;
            corePluginInstance.options.showArrow = backup.showArrow;
            corePluginInstance.options.textFadeMultiplier = backup.textFadeMultiplier;
            corePluginInstance.options.centerStrength = backup.centerStrength;
            corePluginInstance.options.linkDistance = backup.linkDistance;
            corePluginInstance.options.linkStrength = backup.linkStrength;
            corePluginInstance.options.repelStrength = backup.repelStrength;
            corePluginInstance.saveOptions();
        }
    }

    private getCorePluginInstance(): GraphPluginInstance | undefined {
        return PluginInstances.app.internalPlugins.getPluginById("graph")?.instance as GraphPluginInstance;
    }

    applyNormalState(view: GraphView | LocalGraphView) {
        const engine = getEngine(view);
        const options = this.optionsBackup.get(view.leaf.id);
        if (engine && options) {
            engine.setOptions(options);
            for (const node of engine.renderer.nodes) {
                // @ts-ignore
                node.fontDirty = true;
            }
        }
    }


    // =============================== NODE MENU ===============================

    onNodeMenuOpened(menu: Menu, file: TAbstractFile, source: string, leaf?: WorkspaceLeaf) {
        if (source === "graph-context-menu" && leaf && file instanceof TFile) {
            this.allInstances.get(leaf.id)?.dispatcher.onNodeMenuOpened(menu, file);
        }
    }

    // ============================== SCREENSHOT ===============================

    getSVGScreenshot(view: GraphView | LocalGraphView) {
        const instances = this.allInstances.get(view.leaf.id);
        let exportToSVG: ExportGraphToSVG;
        if (instances) {
            exportToSVG = new ExportExtendedGraphToSVG(instances);
        }
        else {
            exportToSVG = new ExportCoreGraphToSVG(getEngine(view));
        }
        exportToSVG.toClipboard();
    }

    // ============================= ZOOM ON NODE ==============================

    zoomOnNode(view: GraphView | LocalGraphView, nodeID: string, targetScale?: number) {
        const renderer = view.renderer;
        const node = renderer.nodes.find(node => node.id === nodeID);
        if (!node) return;

        let scale = renderer.scale;
        if (targetScale === undefined) targetScale = PluginInstances.settings.zoomFactor;
        let panX = renderer.panX
        let panY = renderer.panY;
        renderer.targetScale = Math.min(8, Math.max(1 / 128, targetScale));

        let zoomCenterX = renderer.zoomCenterX;
        let zoomCenterY = renderer.zoomCenterY;

        if (0 === zoomCenterX && 0 === zoomCenterY) {
            const s = window.devicePixelRatio;
            zoomCenterX = renderer.width / 2 * s;
            zoomCenterY = renderer.height / 2 * s;
        }

        const n = 0.85;
        scale = scale * n + targetScale * (1 - n);
        panX -= node.x * scale + panX - zoomCenterX;
        panY -= node.y * scale + panY - zoomCenterY;
        renderer.setPan(panX, panY);
        renderer.setScale(scale);
        renderer.changed();
    }

    // =============================== STATUS BAR ==============================

    updateStatusBarItem(leaf: WorkspaceLeaf | null, numberOfNodes?: number) {
        // Change the number of nodes in the status bar
        this.statusBarItem.replaceChildren();
        this.statusBarItem.removeClass("mod-clickable");
        if (leaf && (leaf.view.getViewType() === "graph" || leaf.view.getViewType() === "localgraph")) {
            if (numberOfNodes === undefined) numberOfNodes = (leaf.view as GraphView | LocalGraphView).renderer.nodes.length;
            if (numberOfNodes !== undefined) {
                this.statusBarItem.createSpan({ text: numberOfNodes.toString() + " " + STRINGS.plugin.nodes, cls: "status-bar-item-segment" });
            }

            const instances = this.allInstances.get(leaf.id);
            if (instances) {
                this.statusBarItem.addClass("mod-clickable");
                const infoButton = createSpan({ cls: "status-bar-item-icon status-bar-item-segment" });
                setIcon(infoButton, "info");
                infoButton.addEventListener('click', () => {
                    const modal = new GraphStateModal(instances);
                    modal.open();
                });
                this.statusBarItem.appendChild(infoButton);
            }
        }
    }
}