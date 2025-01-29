import { CachedMetadata, Component, FileView, Menu, Plugin, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";
import { GraphPluginInstance, GraphPluginInstanceOptions } from "obsidian-typings";
import { ExportCoreGraphToSVG, ExportExtendedGraphToSVG, ExportGraphToSVG, getEngine, GraphControlsUI, GraphEventsDispatcher, MenuUI, NodeStatCalculator, NodeStatCalculatorFactory, TAG_KEY, StatesManager, WorkspaceLeafExt, LinkStatCalculator, GraphAnalysisPlugin, linkStatFunctionNeedsNLP, PluginInstances, GraphInstances } from "./internal";
import ExtendedGraphPlugin from "./main";
import STRINGS from "./Strings";



export class GraphsManager extends Component {
    globalUIs = new Map<string, {menu: MenuUI, control: GraphControlsUI}>();
    optionsBackup = new Map<string, GraphPluginInstanceOptions>();
    activeFile: TFile | null = null;

    lastBackup: string;
    localGraphID: string | null = null;
    
    allInstances = new Map<string, GraphInstances>();
    
    nodesSizeCalculator: NodeStatCalculator | undefined;
    nodeColorCalculator: NodeStatCalculator | undefined;
    linksSizeCalculator: LinkStatCalculator | undefined;

    // ============================== CONSTRUCTOR ==============================
    
    constructor() {
        super();
    }

    // ================================ LOADING ================================

    onload(): void {
        this.initiliazeNodeSizeCalculator();
        this.initializeNodeColorCalculator();
        this.initializeLinkSizeCalculator();
        this.registerEvent(PluginInstances.app.metadataCache.on('changed', this.onMetadataCacheChange.bind(this)));
        this.registerEvent(PluginInstances.app.workspace.on('css-change', this.onCSSChange.bind(this)));
    }

    private initiliazeNodeSizeCalculator(): void {
        this.nodesSizeCalculator = NodeStatCalculatorFactory.getCalculator(PluginInstances.settings.nodesSizeFunction, PluginInstances.app, PluginInstances.settings, 'size');
        this.nodesSizeCalculator?.computeStats();
    }

    private initializeNodeColorCalculator(): void {
        this.nodeColorCalculator = NodeStatCalculatorFactory.getCalculator(PluginInstances.settings.nodesColorFunction, PluginInstances.app, PluginInstances.settings, 'color');
        this.nodeColorCalculator?.computeStats();
    }

    private initializeLinkSizeCalculator(): void {
        const ga = this.getGraphAnalysis();
        const g = (ga["graph-analysis"] as GraphAnalysisPlugin | null)?.g;

        if (!g) {
            this.linksSizeCalculator = undefined;
            return;
        }

        if (!ga.nlp && linkStatFunctionNeedsNLP[PluginInstances.settings.linksSizeFunction]) {
            new Notice(`${STRINGS.notices.nlpPluginRequired} (${PluginInstances.settings.linksSizeFunction})`);
            this.linksSizeCalculator = undefined;
            PluginInstances.settings.linksSizeFunction = 'default';
            PluginInstances.plugin.saveSettings();
            return;
        }

        this.linksSizeCalculator = new LinkStatCalculator(PluginInstances.app, PluginInstances.settings, 'size', g);
        this.linksSizeCalculator.computeStats(PluginInstances.settings.linksSizeFunction);
    }

    // =============================== UNLOADING ===============================

    // ============================= THEME CHANGE ==============================

    private onCSSChange() {
        this.allInstances.forEach(instance => {
            if (instance.nodesSet) {
                instance.nodesSet.updateOpacityLayerColor();
                instance.nodesSet.updateFontFamily();
                instance.graph.renderer.changed();
            }
        });
    }

    // ============================ METADATA CHANGES ===========================

    private onMetadataCacheChange(file: TFile, data: string, cache: CachedMetadata) {
        this.allInstances.forEach(instance => {
            if (!instance.graph || !instance.graph.renderer) return;
    
            if (PluginInstances.settings.enableFeatures[instance.type]['tags']) {
                const extendedNode = instance.nodesSet.extendedElementsMap.get(file.path);
                if (!extendedNode) return;
        
                const newTypes = this.extractTagsFromCache(cache);
                const needsUpdate = !extendedNode.matchesTypes(TAG_KEY, newTypes);

                if (needsUpdate) {
                    this.updateNodeTypes(instance);
                }
            }
        });
    }

    private extractTagsFromCache(cache: CachedMetadata): string[] {
        if (!cache.tags) return [];
        return cache.tags.map(tagCache => tagCache.tag.replace('#', ''));
    }

    private updateNodeTypes(instances: GraphInstances): void {
        const types = instances.nodesSet.getAllTypes(TAG_KEY);
        if (types) {
            instances.nodesSet.managers.get(TAG_KEY)?.addTypes(types);
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
        return this.allInstances.has(leaf.id);
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

        const controlsUI = new GraphControlsUI(leaf);
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
        for (const [id, dispatcher] of this.allInstances) {
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
        this.allInstances.forEach(instance => {
            instance.interactiveManagers.get(interactive)?.recomputeColors();
        });
    }

    updateColor(key: string, type: string): void {
        this.allInstances.forEach(instance => {
            instance.interactiveManagers.get(key)?.recomputeColor(type);
        });
    }

    // ============================= ENABLE PLUGIN =============================

    enablePlugin(leaf: WorkspaceLeafExt, stateID?: string): void {
        this.backupOptions(leaf);

        if (this.isPluginAlreadyEnabled(leaf)) return;
        if (this.isNodeLimitExceeded(leaf)) return;
        
        if (this.getGraphAnalysis()["graph-analysis"]) {
            if (!this.linksSizeCalculator) this.initializeLinkSizeCalculator();
        }
        else {
            this.linksSizeCalculator = undefined;
        }
        const instances = this.addGraph(leaf, stateID);
        const globalUI = this.setGlobalUI(leaf);
        globalUI.menu.setEnableUIState();
        globalUI.control.onPluginEnabled(instances);
    }

    private addGraph(leaf: WorkspaceLeafExt, stateID?: string): GraphInstances {
        let instances = this.allInstances.get(leaf.id);
        if (instances) return instances;

        instances = new GraphInstances(leaf);
        new GraphEventsDispatcher(instances);
        if (stateID) {
            instances.statesUI.currentStateID = stateID;
            instances.statesUI.select.value = stateID;
        }

        this.allInstances.set(leaf.id, instances);
        instances.dispatcher.load();
        leaf.view.addChild(instances.dispatcher);

        if (leaf.view.getViewType() === "localgraph") {
            this.localGraphID = leaf.id;
        }

        return instances;
    }

    isNodeLimitExceeded(leaf: WorkspaceLeafExt): boolean {
        if (leaf.view.renderer.nodes.length > PluginInstances.settings.maxNodes) {
            new Notice(`${STRINGS.notices.nodeLimiteExceeded} (${leaf.view.renderer.nodes.length}). ${STRINGS.notices.nodeLimiteIs} ${PluginInstances.settings.maxNodes}. ${STRINGS.plugin.name} ${STRINGS.notices.disabled}.`);
            return true;
        }
        return false;
    }
    
    getGraphAnalysis(): {"graph-analysis": Plugin | null, "nlp": Plugin | null} {
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
        const instances = this.allInstances.get(leafID);
        if (instances) {
            instances.dispatcher.unload();
        }
    }

    onPluginUnloaded(leaf: WorkspaceLeafExt): void {
        this.allInstances.delete(leaf.id);
        
        if (this.localGraphID === leaf.id) this.localGraphID = null;

        if (leaf.view._loaded) {
            this.applyNormalState(leaf);
        }
        this.restoreBackup();
    }

    // ============================= RESET PLUGIN ==============================

    resetPlugin(leaf: WorkspaceLeafExt): void {
        const dispatcher = this.allInstances.get(leaf.id);
        const stateID = dispatcher?.statesUI.currentStateID;
        const scale = dispatcher ? dispatcher.graph.renderer.targetScale : false;
        this.disablePlugin(leaf);
        this.enablePlugin(leaf, stateID);
        const newDispatcher = this.allInstances.get(leaf.id);
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
                const localDispatcher = this.allInstances.get(this.localGraphID);
                if (localDispatcher) this.resetPlugin(localDispatcher.leaf);
            }
            this.activeFile = view.file;
        }
    }

    changeActiveFile(file: TFile | null): void {
        if (!PluginInstances.settings.enableFeatures['graph']['focus']) return;

        this.allInstances.forEach(instances => {
            if (instances.type !== "graph") return;
            this.deEmphasizePreviousActiveFile(instances);
            this.emphasizeActiveFile(instances, file);
        })
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

    backupOptions(leaf: WorkspaceLeafExt) {
        const engine = getEngine(leaf);
        const options = structuredClone(engine.getOptions());
        this.optionsBackup.set(leaf.id, options);
        this.lastBackup = leaf.id;
        PluginInstances.settings.backupGraphOptions = options;
        PluginInstances.plugin.saveSettings();
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
        return PluginInstances.app.internalPlugins.getPluginById("graph")?.instance as GraphPluginInstance;
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
            this.allInstances.get(leaf.id)?.dispatcher.onNodeMenuOpened(menu, file);
        }
    }

    // ============================== SCREENSHOT ===============================

    getSVGScreenshot(leaf: WorkspaceLeafExt) {
        const instances = this.allInstances.get(leaf.id);
        let exportToSVG: ExportGraphToSVG;
        if (instances) {
            exportToSVG = new ExportExtendedGraphToSVG(instances);
        }
        else {
            exportToSVG = new ExportCoreGraphToSVG(PluginInstances.plugin, getEngine(leaf));
        }
        exportToSVG.toClipboard();
    }

    // ============================= ZOOM ON NODE ==============================

    zoomOnNode(leaf: WorkspaceLeafExt, nodeID: string) {
        const renderer = leaf.view.renderer;
        const node = renderer.nodes.find(node => node.id === nodeID);
        if (!node) return;
        
        let scale = renderer.scale;
        let targetScale = PluginInstances.settings.zoomFactor;
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