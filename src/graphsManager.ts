import { CachedMetadata, Component, FileView, Menu, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";
import { GraphPluginInstance, GraphPluginInstanceOptions } from "obsidian-typings";
import { ExportCoreGraphToSVG, ExportExtendedGraphToSVG, ExportGraphToSVG, getEngine, GraphControlsUI, GraphEventsDispatcher, MenuUI, NodeStatCalculator, NodeStatCalculatorFactory, TAG_KEY, StatesManager, WorkspaceLeafExt } from "./internal";
import ExtendedGraphPlugin from "./main";



export class GraphsManager extends Component {
    globalUIs = new Map<string, {menu: MenuUI, control: GraphControlsUI}>();
    optionsBackup = new Map<string, GraphPluginInstanceOptions>();
    activeFile: TFile | null = null;

    lastBackup: string;
    localGraphID: string | null = null;
    
    plugin: ExtendedGraphPlugin;
    statesManager: StatesManager;
    dispatchers = new Map<string, GraphEventsDispatcher>();
    
    nodeSizeCalculator: NodeStatCalculator | undefined;
    nodeColorCalculator: NodeStatCalculator | undefined;

    // ============================== CONSTRUCTOR ==============================
    
    constructor(plugin: ExtendedGraphPlugin) {
        super();
        this.plugin = plugin;
        this.statesManager = new StatesManager(this);
    }

    // ================================ LOADING ================================

    onload(): void {
        this.initilizeNodeSizeCalculator();
        this.initilizeNodeColorCalculator();
        this.registerEvent(this.plugin.app.metadataCache.on('changed', this.onMetadataCacheChange.bind(this)));
        this.registerEvent(this.plugin.app.workspace.on('css-change', this.onCSSChange.bind(this)));
    }

    private initilizeNodeSizeCalculator(): void {
        this.nodeSizeCalculator = NodeStatCalculatorFactory.getCalculator(this.plugin.settings.nodeSizeFunction, this.plugin.app, this.plugin.settings, 'size');
        this.nodeSizeCalculator?.computeStats();
    }

    private initilizeNodeColorCalculator(): void {
        this.nodeColorCalculator = NodeStatCalculatorFactory.getCalculator(this.plugin.settings.nodeColorFunction, this.plugin.app, this.plugin.settings, 'color');
        this.nodeColorCalculator?.computeStats();
    }

    // =============================== UNLOADING ===============================

    // ============================= THEME CHANGE ==============================

    private onCSSChange() {
        this.dispatchers.forEach(dispatcher => {
            if (dispatcher.graph.nodesSet) {
                dispatcher.graph.nodesSet.updateOpacityLayerColor();
                dispatcher.graph.nodesSet.updateFontFamily();
                dispatcher.graph.renderer.changed();
            }
        });
    }

    // ============================ METADATA CHANGES ===========================

    private onMetadataCacheChange(file: TFile, data: string, cache: CachedMetadata) {
        this.dispatchers.forEach(dispatcher => {
            if (!dispatcher.graph || !dispatcher.graph.renderer) return;
    
            if (this.plugin.settings.enableFeatures[dispatcher.graph.type]['tags']) {
                const extendedNode = dispatcher.graph.nodesSet.extendedElementsMap.get(file.path);
                if (!extendedNode) return;
        
                const newTypes = this.extractTagsFromCache(cache);
                const needsUpdate = !extendedNode.matchesTypes(TAG_KEY, newTypes);

                if (needsUpdate) {
                    this.updateNodeTypes(dispatcher);
                }
            }
        });
    }

    private extractTagsFromCache(cache: CachedMetadata): string[] {
        if (!cache.tags) return [];
        return cache.tags.map(tagCache => tagCache.tag.replace('#', ''));
    }

    private updateNodeTypes(dispatcher: GraphEventsDispatcher): void {
        const types = dispatcher.graph.nodesSet.getAllTypes(TAG_KEY);
        if (types) {
            dispatcher.graph.nodesSet.managers.get(TAG_KEY)?.addTypes(types);
        }
    }

    // ================================ LAYOUT =================================

    onNewLeafOpen(leaf: WorkspaceLeafExt): void {
        try {
            this.setGlobalUI(leaf);
        }
        catch {
            // UI not set, probably because the graph is in a closed sidebar
        }
        if (this.isPluginAlreadyEnabled(leaf)) return;
        if (this.isGlobalGraphAlreadyOpened(leaf)) return;
        this.backupOptions(leaf);
    }

    private isPluginAlreadyEnabled(leaf: WorkspaceLeafExt): boolean {
        return this.dispatchers.has(leaf.id);
    }
    
    private isGlobalGraphAlreadyOpened(leaf: WorkspaceLeafExt): boolean {
        return this.optionsBackup.has(leaf.id) && leaf.view.getViewType() === "graph";
    }

    syncWithLeaves(leaves: WorkspaceLeaf[]): void {
        const currentActiveLeavesID = leaves.map(l => l.id);
        const currentUsedLeavesID = Array.from(this.optionsBackup.keys());
        const localLeaf = leaves.find(l => l.view.getViewType() === "localgraph");
        
        this.localGraphID = localLeaf ? localLeaf.id : null;

        // Remove dispatchers from closed leaves
        for (const id of currentUsedLeavesID) {
            if (! currentActiveLeavesID.includes(id)) {
                this.disablePluginFromLeafID(id);
                this.globalUIs.delete(id);
                if (this.lastBackup !== id) this.optionsBackup.delete(id);
            }
        }
    }

    // =============================== GLOBAL UI ===============================

    private setGlobalUI(leaf: WorkspaceLeafExt): {menu: MenuUI, control: GraphControlsUI} {
        let globalUI = this.globalUIs.get(leaf.id);
        if (globalUI) return globalUI;

        const menuUI = new MenuUI(leaf);
        leaf.view.addChild(menuUI);

        const controlsUI = new GraphControlsUI(leaf, this);
        controlsUI.onPluginDisabled();
        leaf.view.addChild(controlsUI);

        this.registerLeafEvents(leaf);
        
        globalUI = {menu: menuUI, control: controlsUI};
        this.globalUIs.set(leaf.id, globalUI);
        return globalUI;
    }

    private registerLeafEvents(leaf: WorkspaceLeafExt): void {
        this.registerEvent(leaf.on('extended-graph:disable-plugin', this.disablePlugin.bind(this)));
        this.registerEvent(leaf.on('extended-graph:enable-plugin', this.enablePlugin.bind(this)));
        this.registerEvent(leaf.on('extended-graph:reset-plugin', this.resetPlugin.bind(this)));
    }

    // ============================= GLOBAL FILTER =============================

    onGlobalFilterChanged(filter: string): void {
        for (const [id, dispatcher] of this.dispatchers) {
            dispatcher.graph.engine.updateSearch();
            this.updateGlobalFilterUI(id, filter);
        }
    }

    private updateGlobalFilterUI(dispatcherID: string, filter: string): void {
        const textarea = this.globalUIs.get(dispatcherID)?.control.sectionSettings.settingGlobalFilter.controlEl.querySelector("textarea");
        if (textarea) textarea.value = filter;
    }

    // ================================= COLORS ================================

    updatePalette(interactive: string): void {
        this.dispatchers.forEach(dispatcher => {
            dispatcher.graph.interactiveManagers.get(interactive)?.recomputeColors();
        });
    }

    updateColor(key: string, type: string): void {
        this.dispatchers.forEach(dispatcher => {
            dispatcher.graph.interactiveManagers.get(key)?.recomputeColor(type);
        });
    }

    // ============================= ENABLE PLUGIN =============================

    addGraph(leaf: WorkspaceLeafExt, stateID?: string): GraphEventsDispatcher {
        let dispatcher = this.dispatchers.get(leaf.id);
        if (dispatcher) return dispatcher;

        dispatcher = new GraphEventsDispatcher(leaf, this);
        if (stateID) {
            dispatcher.statesUI.currentStateID = stateID;
            dispatcher.statesUI.select.value = stateID;
        }

        this.dispatchers.set(leaf.id, dispatcher);
        dispatcher.load();
        leaf.view.addChild(dispatcher);

        if (leaf.view.getViewType() === "localgraph") {
            this.localGraphID = leaf.id;
        }

        return dispatcher;
    }

    enablePlugin(leaf: WorkspaceLeafExt, stateID?: string): void {
        this.backupOptions(leaf);

        if (this.isPluginAlreadyEnabled(leaf)) return;
        if (this.isNodeLimitExceeded(leaf)) return;
        
        const dispatcher = this.addGraph(leaf, stateID);
        const globalUI = this.setGlobalUI(leaf);
        globalUI.menu.setEnableUIState();
        globalUI.control.onPluginEnabled(dispatcher);
        
    }

    isNodeLimitExceeded(leaf: WorkspaceLeafExt): boolean {
        if (leaf.view.renderer.nodes.length > this.plugin.settings.maxNodes) {
            new Notice(`Try to handle ${leaf.view.renderer.nodes.length}, but the limit is ${this.plugin.settings.maxNodes}. Extended Graph disabled.`);
            return true;
        }
        return false;
    }

    // ============================ DISABLE PLUGIN =============================

    disablePlugin(leaf: WorkspaceLeafExt): void {
        this.disablePluginFromLeafID(leaf.id);
        leaf.view.renderer.changed();
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
        const dispatcher = this.dispatchers.get(leafID);
        if (dispatcher) {
            dispatcher.unload();
        }
    }

    onPluginUnloaded(leaf: WorkspaceLeafExt): void {
        this.dispatchers.delete(leaf.id);
        
        if (this.localGraphID === leaf.id) this.localGraphID = null;

        if (leaf.view._loaded) {
            this.applyNormalState(leaf);
        }
        this.restoreBackup();
    }

    // ============================= RESET PLUGIN ==============================

    resetPlugin(leaf: WorkspaceLeafExt): void {
        const dispatcher = this.dispatchers.get(leaf.id);
        const stateID = dispatcher?.statesUI.currentStateID;
        const scale = dispatcher ? dispatcher.graph.renderer.targetScale : false;
        this.disablePlugin(leaf);
        this.enablePlugin(leaf, stateID);
        const newDispatcher = this.dispatchers.get(leaf.id);
        if (newDispatcher && scale) {
            newDispatcher.graph.renderer.targetScale = scale;
        }
    }

    // ===================== CHANGE CURRENT MARKDOWN FILE ======================

    onActiveLeafChange(leaf: WorkspaceLeaf | null) {
        if (!leaf) return;
        if (this.isMarkdownLeaf(leaf)) {
            this.handleMarkdownViewChange(leaf.view as FileView);
        }
        else {
            this.changeActiveFile(null);
        }
    }

    private isMarkdownLeaf(leaf: WorkspaceLeaf): boolean {
        return (leaf.view.getViewType() === "markdown") && (leaf.view instanceof FileView);
    }

    private handleMarkdownViewChange(view: FileView): void {
        if (this.activeFile !== view.file) {
            this.changeActiveFile(view.file);
            if (this.localGraphID) {
                const localDispatcher = this.dispatchers.get(this.localGraphID);
                if (localDispatcher) this.resetPlugin(localDispatcher.leaf);
            }
            this.activeFile = view.file;
        }
    }

    changeActiveFile(file: TFile | null): void {
        if (!this.plugin.settings.enableFeatures['graph']['focus']) return;

        this.dispatchers.forEach(dispatcher => {
            if (dispatcher.graph.type !== "graph") return;
            this.deEmphasizePreviousActiveFile(dispatcher);
            this.emphasizeActiveFile(dispatcher, file);
        })
    }

    private deEmphasizePreviousActiveFile(dispatcher: GraphEventsDispatcher) {
        if (this.activeFile) {
            dispatcher.graph.nodesSet?.emphasizeNode(this.activeFile, false);
        }
    }

    private emphasizeActiveFile(dispatcher: GraphEventsDispatcher, file: TFile | null) {
        if (file) {
            dispatcher.graph.nodesSet.emphasizeNode(file, true);
        }
    }

    // ==================== HANDLE NORMAL AND DEFAULT STATE ====================

    backupOptions(leaf: WorkspaceLeafExt) {
        const engine = getEngine(leaf);
        const options = structuredClone(engine.getOptions());
        this.optionsBackup.set(leaf.id, options);
        this.lastBackup = leaf.id;
        this.plugin.settings.backupGraphOptions = options;
        this.plugin.saveSettings();
    }

    restoreBackup() {
        const backup = this.optionsBackup.get(this.lastBackup);
        const corePluginInstance = this.getCorePluginInstance();
        if (corePluginInstance && backup) {
            corePluginInstance.options.colorGroups = backup.colorGroups;
            corePluginInstance.options.search = backup.search;
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
        return this.plugin.app.internalPlugins.getPluginById("graph")?.instance as GraphPluginInstance;
    }

    applyNormalState(leaf: WorkspaceLeafExt) {
        const engine = getEngine(leaf);
        const options = this.optionsBackup.get(leaf.id);
        if (engine && options) {
            engine.setOptions(options);
            engine.updateSearch();
        }
    }


    // =============================== NODE MENU ===============================

    onNodeMenuOpened(menu: Menu, file: TAbstractFile, source: string, leaf?: WorkspaceLeaf) {
        if (source === "graph-context-menu" && leaf && file instanceof TFile) {
            this.dispatchers.get(leaf.id)?.onNodeMenuOpened(menu, file);
        }
    }

    // ============================== SCREENSHOT ===============================

    getSVGScreenshot(leaf: WorkspaceLeafExt) {
        const dispatcher = this.dispatchers.get(leaf.id);
        let exportToSVG: ExportGraphToSVG;
        if (dispatcher) {
            exportToSVG = new ExportExtendedGraphToSVG(dispatcher.graph);
        }
        else {
            exportToSVG = new ExportCoreGraphToSVG(this.plugin, getEngine(leaf));
        }
        exportToSVG.toClipboard();
    }

    // ============================= ZOOM ON NODE ==============================

    zoomOnNode(leaf: WorkspaceLeafExt, nodeID: string) {
        const renderer = leaf.view.renderer;
        const node = renderer.nodes.find(node => node.id === nodeID);
        if (!node) return;
        
        let scale = renderer.scale;
        let targetScale = this.plugin.settings.zoomFactor;
        let panX = renderer.panX
        let panY = renderer.panY;
        renderer.targetScale = Math.min(8, Math.max(1 / 128, targetScale));
        
        let zoomCenterX = renderer.zoomCenterX;
        let zoomCenterY = renderer.zoomCenterY;

        if (0 === zoomCenterX && 0 === zoomCenterY) {
            var s = window.devicePixelRatio;
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
}