import { Component } from "obsidian";
import { GraphColorAttributes, GraphData, GraphLink } from "obsidian-typings";
import { Container, DisplayObject, Text } from "pixi.js";
import * as Color from 'src/colors/color-bits';
import {
    applyCSSStyle,
    ExtendedGraphSettings,
    FOLDER_KEY,
    GCFolders,
    getFile,
    getFileInteractives,
    getFolderStyle,
    getLinkID,
    getNodeTextStyle,
    Graph,
    GraphInstances,
    GraphologyGraph,
    InputsManager,
    LegendUI,
    lengthSegment,
    LINK_KEY,
    LinksStatCalculatorFactory,
    linkStatFunctionIsDynamic,
    linkStatFunctionLabels,
    LinkText,
    NodeStatCalculatorFactory,
    nodeStatFunctionIsDynamic,
    nodeStatFunctionLabels,
    Pinner,
    PluginInstances,
    RadialMenuManager,
    SettingQuery,
    StatesUI,
    t
} from "src/internal";
import { GraphFilter } from "./graphFilter";

interface LastFilteringAction {
    id: 'core-search' | 'core-tags' | 'core-attachments' | 'core-hide-unresolved' | 'core-orphans'
    | 'core-local-jumps' | 'core-local-forelinks' | 'core-local-backlinks'
    | 'plugin-interactives' | 'plugin-state-change' | undefined;

    searchNew: string;
    searchOld: string;
    showTagsNew: boolean;
    showTagsOld: boolean;
    showAttachmentsNew: boolean;
    showAttachmentsOld: boolean;
    hideUnresolvedNew: boolean;
    hideUnresolvedOld: boolean;
    showOrphansNew: boolean;
    showOrphansOld: boolean;

    localJumpsNew: number,
    localJumpsOld: number,
    localForelinksNew: boolean,
    localForelinksOld: boolean,
    localBacklinksNew: boolean;
    localBacklinksOld: boolean;

    interactives: { key: string, types: string[] };
    stateIDNew: string;
    stateIDOld: string;

    record: boolean;
    userChange: boolean;
}

export class GraphEventsDispatcher extends Component {
    instances: GraphInstances;
    inputsManager: InputsManager;
    reloadStateDuringInit: boolean;

    lastFilteringAction: LastFilteringAction | undefined;
    lastCheckboxContainerToggled: HTMLDivElement | undefined;

    isLocalResetting: boolean = false;
    listenStage: boolean = true;
    coreArrowAlpha?: number;
    coreLineHighlightColor?: GraphColorAttributes;
    coreSetData: (data: GraphData) => void;

    // ============================== CONSTRUCTOR ==============================

    /**
     * Constructor for GraphEventsDispatcher.
     * @param leaf - The workspace leaf.
     * @param graphsManager - The graphs manager.
     */
    constructor(instances: GraphInstances, reloadState: boolean) {
        super();
        this.instances = instances;
        this.reloadStateDuringInit = reloadState;
        this.instances.filter = new GraphFilter(this.instances);
        instances.dispatcher = this;
        this.initializeGraph();
        this.initializeUI();
        this.initializeFoldersUI();
    }

    private initializeGraph(): void {
        new Graph(this.instances);
        this.addChild(this.instances.graph);
    }

    private initializeUI(): void {
        this.initializeLegendUI();

        this.instances.statesUI = new StatesUI(this.instances);
        this.instances.statesUI.updateStatesList();

        this.addChild(this.instances.statesUI);
    }

    private initializeLegendUI(): void {
        const settings = PluginInstances.settings;
        if (settings.enableFeatures[this.instances.type]['links'] || settings.enableFeatures[this.instances.type]['tags'] || this.hasAdditionalProperties(settings)) {
            this.instances.legendUI = new LegendUI(this.instances);
            this.addChild(this.instances.legendUI);
        }
    }

    private initializeFoldersUI(): void {
        if (!PluginInstances.settings.enableFeatures[this.instances.type]['folders']) return;

        const graphControls = PluginInstances.graphsManager.globalUIs.get(this.instances.view.leaf.id)?.control;
        if (!graphControls) return;

        const foldersManager = this.instances.foldersSet?.managers.get(FOLDER_KEY);
        if (!foldersManager) return;
        this.instances.foldersUI = new GCFolders(this.instances, foldersManager);
        this.instances.foldersUI.display();
    }

    private hasAdditionalProperties(settings: ExtendedGraphSettings): boolean {
        return settings.enableFeatures[this.instances.type]['properties'] && Object.values(settings.additionalProperties).some(p => p[this.instances.type]);
    }

    // ================================ LOADING ================================

    /**
     * Called when the component is loaded.
     */
    onload(): void {
        this.createStyleElementsForCSSBridge();
        this.loadCurrentStateEngineOptions();
        this.initGraphologyStats();
        this.createSetDataProxy();
    }

    private loadCurrentStateEngineOptions(): void {
        if (!this.reloadStateDuringInit) return;
        const state = PluginInstances.settings.states.find(v => v.id === this.instances.statesUI.currentStateID);
        if (state) {
            this.instances.engine.setOptions(state.engineOptions);
            for (const node of this.instances.renderer.nodes) {
                // @ts-ignore
                node.fontDirty = true;
            }
        }
    }

    /**
     * Called when the graph is ready.
     */
    onGraphReady(): void {
        try {
            this.updateOpacityLayerColor();

            if (this.isLocalResetting) {
                this.isLocalResetting = false;
            }
            else {
                this.bindStageEvents();
                this.inputsManager = new InputsManager(this.instances);

                this.createRenderCallbackProxy();
                this.createInitGraphicsProxy();
                this.createDestroyGraphicsProxy();
                this.changeArrowAlpha();
                this.removeLineHighlight();
                this.loadLastFilteringAction();
                this.registerEventsForLastFilteringAction();
                if (this.reloadStateDuringInit) {
                    PluginInstances.statesManager.changeState(this.instances, this.instances.statesUI.currentStateID);
                }
            }

            PluginInstances.graphsManager.onPluginLoaded(this.instances.view);

            // Make sure to render one frame in order to render every changes made by the plugin
            if (this.instances.renderer.idleFrames > 60) {
                this.instances.renderer.idleFrames = 60;
                this.instances.renderer.queueRender();
            }
        }
        catch (error) {
            this.listenStage = false;
            if (typeof error === "string") {
                console.error(error.toUpperCase());
            } else if (error instanceof Error) {
                console.error(error.message);
            }
            PluginInstances.graphsManager.disablePluginFromLeafID(this.instances.view.leaf.id);
            return;
        }
    }

    private updateOpacityLayerColor(): void {
        if (this.instances.settings.fadeOnDisable) {
            this.instances.nodesSet.updateOpacityLayerColor();
        }
    }

    private bindStageEvents(): void {
        this.onChildAddedToStage = this.onChildAddedToStage.bind(this);
        this.instances.renderer.hanger.on('childAdded', this.onChildAddedToStage);

        this.onChildRemovedFromStage = this.onChildRemovedFromStage.bind(this);
        this.instances.renderer.hanger.on('childRemoved', this.onChildRemovedFromStage);
    }

    private createRenderCallbackProxy(): void {
        const beforeRenderCallback = this.beforeRenderCallback.bind(this);
        PluginInstances.proxysManager.registerProxy<typeof this.instances.renderer.renderCallback>(
            this.instances.renderer,
            "renderCallback",
            {
                apply(target, thisArg, args) {
                    beforeRenderCallback();
                    return Reflect.apply(target, thisArg, args);
                }
            }
        );
    }

    private initGraphologyStats(): void {
        if (!SettingQuery.needDynamicGraphology(this.instances)) return;

        this.instances.graphologyGraph = new GraphologyGraph(this.instances);

        if (SettingQuery.needDynamicGraphology(this.instances, { element: "node", stat: "size" })) {
            try {
                this.instances.nodesSizeCalculator = NodeStatCalculatorFactory.getCalculator('size', this.instances);
                this.instances.nodesSizeCalculator?.computeStats(this.instances.settings.invertNodeStats);
            }
            catch (error) {
                console.error(error);
                new Notice(`${t("notices.nodeStatSizeFailed")} (${nodeStatFunctionLabels[this.instances.settings.nodesSizeFunction]}). ${t("notices.functionToDefault")}`);
                this.instances.settings.nodesSizeFunction = 'default';
                this.instances.nodesSizeCalculator = undefined;
            }
        }

        if (SettingQuery.needDynamicGraphology(this.instances, { element: "node", stat: "color" })) {
            try {
                this.instances.nodesColorCalculator = NodeStatCalculatorFactory.getCalculator('color', this.instances);
                this.instances.nodesColorCalculator?.computeStats(this.instances.settings.invertNodeStats);
            } catch (error) {
                console.error(error);
                new Notice(`${t("notices.nodeStatColorFailed")} (${nodeStatFunctionLabels[this.instances.settings.nodesColorFunction]}). ${t("notices.functionToDefault")}`);
                this.instances.settings.nodesColorFunction = 'default';
                this.instances.nodesColorCalculator = undefined;
            }
        }

        if (SettingQuery.needDynamicGraphology(this.instances, { element: "link", stat: "size" })) {
            try {
                this.instances.linksSizeCalculator = LinksStatCalculatorFactory.getCalculator('size', this.instances);
                this.instances.linksSizeCalculator?.computeStats();
            } catch (error) {
                console.error(error);
                new Notice(`${t("notices.linkStatSizeFailed")} (${linkStatFunctionLabels[this.instances.settings.linksSizeFunction]}). ${t("notices.functionToDefault")}`);
                this.instances.settings.linksSizeFunction = 'default';
                this.instances.linksSizeCalculator = undefined;
            }
        }

        if (SettingQuery.needDynamicGraphology(this.instances, { element: "link", stat: "color" })) {
            try {
                this.instances.linksColorCalculator = LinksStatCalculatorFactory.getCalculator('color', this.instances);
                this.instances.linksColorCalculator?.computeStats();
            } catch (error) {
                console.error(error);
                new Notice(`${t("notices.linkStatColorFailed")} (${linkStatFunctionLabels[this.instances.settings.linksColorFunction]}). ${t("notices.functionToDefault")}`);
                this.instances.settings.linksColorFunction = 'default';
                this.instances.linksColorCalculator = undefined;
            }
        }
    }

    private createSetDataProxy() {
        const updateData = this.updateData.bind(this);
        const instances = this.instances;

        PluginInstances.proxysManager.registerProxy<typeof this.instances.renderer.setData>(
            this.instances.renderer,
            "setData",
            {
                apply(target, thisArg, args) {
                    const data = updateData(args[0] as GraphData);
                    if (data) {
                        args[0] = data;
                        const res = Reflect.apply(target, thisArg, args);

                        // Recompute the graphology
                        instances.graphologyGraph?.buildGraphology();

                        return res;
                    }
                    else {
                        return false;
                    }
                }
            }
        )

    }

    private createDestroyGraphicsProxy() {
        const beforeDestroyGraphics = this.beforeDestroyGraphics.bind(this);
        PluginInstances.proxysManager.registerProxy<typeof this.instances.renderer.destroyGraphics>(
            this.instances.renderer,
            "destroyGraphics",
            {
                apply(target, thisArg, argArray) {
                    beforeDestroyGraphics();
                    return Reflect.apply(target, thisArg, argArray);
                },
            }
        );
    }

    private createInitGraphicsProxy() {
        const afterInitGraphics = this.afterInitGraphics.bind(this);
        PluginInstances.proxysManager.registerProxy<typeof this.instances.renderer.initGraphics>(
            this.instances.renderer,
            "initGraphics",
            {
                apply(target, thisArg, argArray) {
                    const res = Reflect.apply(target, thisArg, argArray);
                    afterInitGraphics();
                    return res;
                },
            }
        );
    }

    private changeArrowAlpha(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['arrows']
            || !this.instances.settings.opaqueArrowsButKeepFading
        ) return;

        this.coreArrowAlpha = this.instances.renderer.colors.arrow.a;
        this.instances.renderer.colors.arrow.a = 1;
    }

    private removeLineHighlight(): void {
        if (!this.instances.settings.noLineHighlight) return;
        this.coreLineHighlightColor = this.instances.renderer.colors.lineHighlight;
        this.instances.renderer.colors.lineHighlight = this.instances.renderer.colors.line;
    }

    private loadLastFilteringAction(): void {
        this.lastFilteringAction = {
            id: undefined,
            searchNew: this.instances.engine.filterOptions.search.getValue() || '',
            searchOld: this.instances.engine.filterOptions.search.getValue() || '',
            showTagsNew: this.instances.engine.options.showTags || false,
            showTagsOld: this.instances.engine.options.showTags || false,
            showAttachmentsNew: this.instances.engine.options.showAttachments || false,
            showAttachmentsOld: this.instances.engine.options.showAttachments || false,
            hideUnresolvedNew: this.instances.engine.options.hideUnresolved || false,
            hideUnresolvedOld: this.instances.engine.options.hideUnresolved || false,
            showOrphansNew: this.instances.engine.options.showOrphans || true,
            showOrphansOld: this.instances.engine.options.showOrphans || true,
            localJumpsNew: this.instances.engine.options.localJumps || 1,
            localJumpsOld: this.instances.engine.options.localJumps || 1,
            localForelinksNew: this.instances.engine.options.localForelinks || true,
            localForelinksOld: this.instances.engine.options.localForelinks || true,
            localBacklinksNew: this.instances.engine.options.localBacklinks || true,
            localBacklinksOld: this.instances.engine.options.localBacklinks || true,
            interactives: { key: '', types: [] },
            stateIDNew: this.instances.statesUI.currentStateID,
            stateIDOld: this.instances.statesUI.currentStateID,

            record: true,
            userChange: false,
        }
    }

    private registerEventsForLastFilteringAction(): void {
        if (!this.lastFilteringAction) return;
        const lastFilteringAction = this.lastFilteringAction;

        // Search
        if (this.instances.engine.filterOptions.search.changeCallback) {
            PluginInstances.proxysManager.registerProxy<typeof this.instances.engine.filterOptions.search.changeCallback>(
                this.instances.engine.filterOptions.search,
                'changeCallback',
                {
                    apply(target, thisArg, args) {
                        if (!lastFilteringAction.record) return Reflect.apply(target, thisArg, args);

                        lastFilteringAction.id = 'core-search';
                        lastFilteringAction.userChange = true;
                        lastFilteringAction.searchOld = lastFilteringAction.searchNew;
                        lastFilteringAction.searchNew = args[0];
                        return Reflect.apply(target, thisArg, args);
                    }
                }
            );
        }

        // Checkbox filters
        this.updateLastCheckboxToggled = this.updateLastCheckboxToggled.bind(this);
        const checkboxes = this.instances.view.contentEl.querySelectorAll('.graph-control-section.mod-filter .checkbox-container');
        for (const checkboxContainer of Array.from(checkboxes)) {
            checkboxContainer.addEventListener('mousedown', this.updateLastCheckboxToggled);
        }

        PluginInstances.proxysManager.registerProxy<typeof this.instances.engine.options>(
            this.instances.engine,
            'options',
            {
                set(target, p, newValue, receiver) {
                    if (!lastFilteringAction.record) return Reflect.set(target, p, newValue, receiver);

                    if (p === 'showTags') {
                        lastFilteringAction.id = 'core-tags';
                        lastFilteringAction.userChange = true;
                        lastFilteringAction.showTagsOld = lastFilteringAction.showTagsNew;
                        lastFilteringAction.showTagsNew = newValue;
                    }
                    else if (p === 'showAttachments') {
                        lastFilteringAction.id = 'core-attachments';
                        lastFilteringAction.userChange = true;
                        lastFilteringAction.showAttachmentsOld = lastFilteringAction.showAttachmentsNew;
                        lastFilteringAction.showAttachmentsNew = newValue;
                    }
                    else if (p === 'hideUnresolved') {
                        lastFilteringAction.id = 'core-hide-unresolved';
                        lastFilteringAction.userChange = true;
                        lastFilteringAction.hideUnresolvedOld = lastFilteringAction.hideUnresolvedNew;
                        lastFilteringAction.hideUnresolvedNew = newValue;
                    }
                    else if (p === 'showOrphans') {
                        lastFilteringAction.id = 'core-orphans';
                        lastFilteringAction.userChange = true;
                        lastFilteringAction.showOrphansOld = lastFilteringAction.showOrphansNew;
                        lastFilteringAction.showOrphansNew = newValue;
                    }
                    else if (p === 'localJumps') {
                        lastFilteringAction.id = 'core-local-jumps';
                        lastFilteringAction.userChange = true;
                        lastFilteringAction.localJumpsOld = lastFilteringAction.localJumpsNew;
                        lastFilteringAction.localJumpsNew = newValue;
                    }
                    else if (p === 'localForelinks') {
                        lastFilteringAction.id = 'core-local-forelinks';
                        lastFilteringAction.userChange = true;
                        lastFilteringAction.localForelinksOld = lastFilteringAction.localForelinksNew;
                        lastFilteringAction.localForelinksNew = newValue;
                    }
                    else if (p === 'localBacklinks') {
                        lastFilteringAction.id = 'core-local-backlinks';
                        lastFilteringAction.userChange = true;
                        lastFilteringAction.localBacklinksOld = lastFilteringAction.localBacklinksNew;
                        lastFilteringAction.localBacklinksNew = newValue;
                    }
                    return Reflect.set(target, p, newValue, receiver);
                },
            }
        )
    }

    private setLastFilteringActionAsStateChange(stateID: string) {
        if (!this.lastFilteringAction || !this.lastFilteringAction.record) return;
        this.lastFilteringAction.id = 'plugin-state-change';
        this.lastFilteringAction.userChange = true;
        this.lastFilteringAction.stateIDOld = this.lastFilteringAction.stateIDNew;
        this.lastFilteringAction.stateIDNew = stateID;
    }

    private setLastFilteringActionAsInteractive(key: string, types: string[]) {
        if (!this.lastFilteringAction || !this.lastFilteringAction.record) return;
        if (key !== FOLDER_KEY) {
            this.lastFilteringAction.id = 'plugin-interactives';
            this.lastFilteringAction.userChange = true;
            this.lastFilteringAction.interactives = { key, types };
        }
    }

    private updateLastCheckboxToggled(ev: MouseEvent) {
        this.lastCheckboxContainerToggled = ev.currentTarget as HTMLDivElement;
    }

    // =============================== RESETTING ===============================

    reloadLocalDispatcher(): void {
        if (this.instances.type !== "localgraph") return;

        this.isLocalResetting = true;
        this.instances.graph.unload();
        this.instances.graph.load();
    }

    // =============================== UNLOADING ===============================

    /**
     * Called when the component is unloaded.
     */
    onunload(): void {
        this.removeStylingForCSSBridge();
        this.unbindStageEvents();
        PluginInstances.proxysManager.unregisterProxy(this.instances.renderer.renderCallback);
        PluginInstances.proxysManager.unregisterProxy(this.instances.renderer.setData);
        PluginInstances.proxysManager.unregisterProxy(this.instances.renderer.destroyGraphics);
        PluginInstances.proxysManager.unregisterProxy(this.instances.renderer.initGraphics);
        this.instances.foldersUI?.destroy();
        this.inputsManager.unload();
        PluginInstances.graphsManager.onPluginUnloaded(this.instances.view);
        this.restoreArrowAlpha();
        this.restoreLineHighlight();
        this.unregisterEventsForLastFilteringAction();
        this.instances.engine.render();
    }

    private unbindStageEvents(): void {
        this.instances.renderer.hanger.off('childAdded', this.onChildAddedToStage);
        this.instances.renderer.hanger.off('childRemoved', this.onChildRemovedFromStage);
    }

    private restoreArrowAlpha(): void {
        if (this.coreArrowAlpha !== undefined) {
            this.instances.renderer.colors.arrow.a = this.coreArrowAlpha;
            this.coreArrowAlpha = undefined;
        }
    }

    private restoreLineHighlight(): void {
        if (this.coreLineHighlightColor !== undefined) {
            this.instances.renderer.colors.lineHighlight = this.coreLineHighlightColor;
            this.coreLineHighlightColor = undefined;
        }
    }

    private unregisterEventsForLastFilteringAction(): void {
        PluginInstances.proxysManager.unregisterProxy(this.instances.engine.filterOptions.search.changeCallback);

        const checkboxes = this.instances.view.contentEl.querySelectorAll('.graph-control-section.mod-filter .checkbox-container');
        for (const checkboxContainer of Array.from(checkboxes)) {
            checkboxContainer.addEventListener('mousedown', this.updateLastCheckboxToggled);
        }

        PluginInstances.proxysManager.unregisterProxy(this.instances.engine.options);
    }

    // ============================= STAGE EVENTS ==============================

    /**
     * Called when a child is added to the stage by the engine.
     */
    private onChildAddedToStage(child: DisplayObject, container: Container, index: number): void {
        if (!this.listenStage) return;

        const node = this.instances.renderer.nodes.find(n => n.circle === child);
        if (node) {
            if (PluginInstances.graphsManager.isNodeLimitExceededForView(this.instances.view)) {
                this.listenStage = false;
                setTimeout(() => {
                    PluginInstances.graphsManager.disablePluginFromLeafID(this.instances.view.leaf.id);
                }, 200);
                return;
            }
            const extendedNode = this.instances.nodesSet.extendedElementsMap.get(node.id);
            if (!extendedNode) {
                this.instances.nodesSet.load();
            }
            else {
                extendedNode.setCoreElement(node);
            }
            const file = getFile(node.id);
            const folderManager = this.instances.foldersSet?.managers.get(FOLDER_KEY);
            if (file && folderManager) {
                const paths = getFileInteractives(FOLDER_KEY, file);
                for (const path of paths) {
                    if (folderManager.isActive(path)) {
                        this.instances.foldersSet?.loadFolder(FOLDER_KEY, path);
                    }
                }
            }
        }

        const link = this.instances.renderer.links.find(l => l.px === child || l.arrow === child);
        if (link) {
            const add = (l: GraphLink) => {
                const extendedLink = this.instances.linksSet.extendedElementsMap.get(getLinkID(l));
                if (!extendedLink) {
                    this.instances.linksSet.load(getLinkID(l));
                }
                else {
                    extendedLink.setCoreElement(l);
                }
            }
            // We can add the link only if the line AND the arrow (if needed) have been added
            const canAdd = (l: GraphLink) => {
                return l.line && (!this.instances.renderer.fShowArrow || !!l.arrow);
            }
            if (canAdd(link)) {
                add(link);
            }
            else if (link.px === child) {
                // Check if "line" is added to the px
                child.on('childAdded', (child2: DisplayObject, container2: Container<DisplayObject>, index2: number) => {
                    if (child2 instanceof LinkText) return;
                    if (canAdd(link)) {
                        add(link);
                    }
                });
            }
        }

        if ("text" in child) {
            const node = this.instances.renderer.nodes.find(n => n.text === child as Text);
            if (node) {
                const extendedNode = this.instances.nodesSet.extendedElementsMap.get(node.id);
                if (extendedNode) {
                    extendedNode.extendedText.init();
                }
            }
        }
    }

    private onChildRemovedFromStage(child: DisplayObject, container: Container<DisplayObject>, index: number): void {
        if (!this.listenStage) return;

        if (this.instances.foldersSet) {
            for (const [id, folderBlob] of this.instances.foldersSet.foldersMap) {
                const nodesToRemove = folderBlob.nodes.filter(n => n.circle === null);
                for (const node of nodesToRemove) {
                    folderBlob.removeNode(node);
                }
                if (nodesToRemove.length > 0) {
                    folderBlob.updateGraphics(this.instances.renderer.scale);
                }
            }
        }
    }

    private updateData(data: GraphData): GraphData | undefined {
        // Filter out nodes
        data = this.instances.filter.filterNodes(data);

        const showNotice = this.lastFilteringAction?.userChange || true;
        if (this.lastFilteringAction) this.lastFilteringAction.userChange = false;
        if (PluginInstances.graphsManager.isNodeLimitExceededForData(data, showNotice)) {
            if (PluginInstances.settings.revertAction && this.lastFilteringAction) {
                this.revertLastFilteringAction();
                return undefined;
            }
            else {
                this.listenStage = false;
                setTimeout(() => {
                    PluginInstances.graphsManager.disablePluginFromLeafID(this.instances.view.leaf.id);
                }, 200);
                return undefined;
            }
        }

        return data;
    }

    // ============================== GRAPH CYCLE ==============================

    private beforeDestroyGraphics() {
        this.unbindStageEvents();
        PluginInstances.proxysManager.unregisterProxy(this.instances.renderer.renderCallback);
        for (const el of this.instances.nodesSet.extendedElementsMap.values()) {
            PluginInstances.proxysManager.unregisterProxy(el.coreElement.text)
        }
        for (const el of this.instances.linksSet.extendedElementsMap.values()) {
            el.restoreCoreElement();
        }
    }

    private showDestroyed(el: any) {
        if (!("children" in el)) return;
        for (const child of el.children) {
            if (child.destroyed) {
                console.debug(child);
            }
            else {
                this.showDestroyed(child);
            }
        }
    }

    private afterInitGraphics() {
        setTimeout(() => {
            this.createStyleElementsForCSSBridge();
            for (const el of this.instances.linksSet.extendedElementsMap.values()) {
                el.init();
            }
            for (const el of this.instances.nodesSet.extendedElementsMap.values()) {
                el.init();
            }
            this.instances.nodesSet.onCSSChange();
            this.instances.foldersSet?.initGraphics();
            this.createRenderCallbackProxy();
            this.bindStageEvents();
            this.instances.renderer.changed();
        }, this.instances.settings.delay);
    }

    private beforeRenderCallback() {
        // If nodes need to be pinned because we just changed the state and new nodes were added
        if (this.instances.statePinnedNodes) {
            const pinner = new Pinner(this.instances);
            pinner.setPinnedNodesFromState();
        }

        // Update the graphics of folders in order to redraw the box when nodes move
        if (this.instances.foldersSet) this.instances.foldersSet.updateGraphics();

        // Update the graphics of the links
        if (this.instances.settings.enableFeatures[this.instances.type]['links']
            && (this.instances.settings.interactiveSettings[LINK_KEY].showOnGraph
                || this.instances.settings.curvedLinks
                || this.instances.settings.displayLinkTypeLabel
            )
        ) {
            for (const id of this.instances.linksSet.connectedIDs) {
                const link = this.instances.linksSet.extendedElementsMap.get(id);
                if (!link) continue;
                link.graphicsWrapper?.pixiElement.updateFrame();
                if (link.texts) {
                    const linkLength = lengthSegment(
                        1,
                        link.coreElement.source.circle?.position ?? { x: 0, y: 0 },
                        link.coreElement.target.circle?.position ?? { x: 0, y: 0 }
                    );
                    // const minSegmentLength = 110;
                    const visibleTexts = link.texts.filter(text => this.instances.linksSet.managers.get(LINK_KEY)?.isActive(text.text.text));
                    const segmentLength = linkLength / visibleTexts.length;
                    let i = 0;
                    for (const text of link.texts) {
                        if (visibleTexts.contains(text)) {
                            if (Math.floor((i - segmentLength) / 110) < Math.floor(i / 110)) {
                                text.isRendered = true;
                                text.updateFrame();
                            }
                            else {
                                text.isRendered = false;
                                text.visible = false;
                            }
                            i += segmentLength;
                        }
                        else {
                            text.isRendered = false;
                            text.visible = false;
                        }
                    }
                }
            }
        }
    }

    // ========================== REVERT LAST ACTION ===========================

    private revertLastFilteringAction(): void {
        // Disable the plugin if no last action was recorder (the plugin was just enabled)
        if (!this.lastFilteringAction || this.lastFilteringAction.id === undefined) {
            this.listenStage = false;
            PluginInstances.graphsManager.disablePluginFromLeafID(this.instances.view.leaf.id);
            return;
        }

        switch (this.lastFilteringAction.id) {
            case 'core-search':
                this.instances.engine.filterOptions.search.inputEl.blur();
                this.lastFilteringAction.searchNew = this.lastFilteringAction.searchOld;
                this.instances.engine.filterOptions.search.inputEl.value = this.lastFilteringAction.searchOld;
                this.instances.engine.updateSearch();
                break;
            case 'core-tags':
                this.lastCheckboxContainerToggled?.dispatchEvent(new Event('click'));
                this.lastFilteringAction.showTagsNew = this.lastFilteringAction.showTagsOld;
                break;
            case 'core-attachments':
                this.lastCheckboxContainerToggled?.dispatchEvent(new Event('click'));
                this.lastFilteringAction.showAttachmentsNew = this.lastFilteringAction.showAttachmentsOld;
                break;
            case 'core-hide-unresolved':
                this.lastCheckboxContainerToggled?.dispatchEvent(new Event('click'));
                this.lastFilteringAction.hideUnresolvedNew = this.lastFilteringAction.hideUnresolvedOld;
                break;
            case 'core-orphans':
                this.lastCheckboxContainerToggled?.dispatchEvent(new Event('click'));
                this.lastFilteringAction.showOrphansNew = this.lastFilteringAction.showOrphansOld;
                break;
            case 'core-local-jumps':
                this.lastCheckboxContainerToggled?.dispatchEvent(new Event('click'));
                this.lastFilteringAction.localJumpsNew = this.lastFilteringAction.localJumpsOld;
                break;
            case 'core-local-forelinks':
                this.lastCheckboxContainerToggled?.dispatchEvent(new Event('click'));
                this.lastFilteringAction.localForelinksNew = this.lastFilteringAction.localForelinksOld;
                break;
            case 'core-local-backlinks':
                this.lastCheckboxContainerToggled?.dispatchEvent(new Event('click'));
                this.lastFilteringAction.localBacklinksNew = this.lastFilteringAction.localBacklinksOld;
                break;
            case 'plugin-interactives':
                const manager = this.instances.interactiveManagers.get(this.lastFilteringAction.interactives.key);
                if (manager) {
                    manager.disable(this.lastFilteringAction.interactives.types);
                    for (const type of this.lastFilteringAction.interactives.types) {
                        this.instances.legendUI?.disableUI(this.lastFilteringAction.interactives.key, type);
                    }
                }
                break;
            case 'plugin-state-change':
                if (this.lastFilteringAction.stateIDNew !== this.lastFilteringAction.stateIDOld) {
                    this.lastFilteringAction.stateIDNew = this.lastFilteringAction.stateIDOld;
                    this.instances.statesUI.setValue(this.lastFilteringAction.stateIDOld);
                    PluginInstances.statesManager.changeState(this.instances, this.lastFilteringAction.stateIDOld);
                }
                break;
        }
    }

    // ============================= INTERACTIVES ==============================

    /**
     * Handles the addition of interactive elements.
     * @param name - The name of the interactive element type.
     * @param colorMaps - A map of types to their corresponding colors.
     */
    onInteractivesAdded(name: string, colorMaps: Map<string, Color.Color>) {
        if (name === LINK_KEY) {
            this.onLinkTypesAdded(colorMaps);
        } else if (name === FOLDER_KEY) {
            this.onFoldersAdded(colorMaps);
        } else {
            this.onNodeInteractiveTypesAdded(name, colorMaps);
        }
    }

    /**
     * Handles the removal of interactive elements.
     * @param name - The name of the interactive element type.
     * @param types - A set of types to be removed.
     */
    onInteractivesRemoved(name: string, types: Set<string> | string[]) {
        if (name === LINK_KEY) {
            this.onLinkTypesRemoved(types);
        } else if (name === FOLDER_KEY) {
            this.onFoldersRemoved(types);
        } else {
            this.onNodeInteractiveTypesRemoved(name, types);
        }
    }

    /**
     * Handles the color change of interactive elements.
     * @param key - The name of the interactive element type.
     * @param type - The type of the interactive element.
     * @param color - The new color of the interactive element.
     */
    onInteractiveColorChanged(key: string, type: string, color: Color.Color) {
        if (key === LINK_KEY) {
            this.onLinkColorChanged(type, color);
        } else if (key === FOLDER_KEY) {
            this.onFolderColorChanged(type, color);
        } else {
            this.onNodeInteractiveColorChanged(key, type, color);
        }
    }

    /**
     * Handles the disabling of interactive elements.
     * @param key - The name of the interactive element type.
     * @param types - An array of types to be disabled.
     */
    onInteractivesDisabled(key: string, types: string[]) {
        if (key === LINK_KEY) {
            this.instances.graph.disableLinkTypes(types);
            this.instances.engine.render();
            this.instances.renderer.changed();
        } else if (key === FOLDER_KEY) {
            this.disableFolders(types);
        } else {
            this.instances.graph.disableNodeInteractiveTypes(key, types);
            if (!this.instances.settings.fadeOnDisable) {
                this.instances.engine.render();
            }
            this.instances.renderer.changed();
        }
    }

    /**
     * Handles the enabling of interactive elements.
     * @param key - The name of the interactive element type.
     * @param types - An array of types to be enabled.
     */
    onInteractivesEnabled(key: string, types: string[]) {
        this.setLastFilteringActionAsInteractive(key, types);

        if (key === LINK_KEY) {
            this.instances.graph.enableLinkTypes(types);
            this.instances.engine.render();
            this.instances.renderer.changed();
        } else if (key === FOLDER_KEY) {
            this.enableFolders(types);
        } else {
            this.instances.graph.enableNodeInteractiveTypes(key, types);
            if (!this.instances.settings.fadeOnDisable) {
                this.instances.engine.render();
            }
            this.instances.renderer.changed();
        }
    }

    onInteractivesLogicChanged(key: string) {
        if (key === LINK_KEY) {
            for (const [id, extendedLink] of this.instances.linksSet.extendedElementsMap) {
                if (extendedLink.isEnabled && extendedLink.isAnyManagerDisabled()) {
                    extendedLink.disable();
                }
            }
        }
    }

    // ================================= TAGS ==================================

    // TAGS

    private onNodeInteractiveTypesAdded(key: string, colorMaps: Map<string, Color.Color>) {
        // Update UI
        if (this.instances.legendUI) {
            for (const [type, color] of colorMaps) {
                this.instances.legendUI.add(key, type, color);
            }
        }
        // Update Graph is needed
        this.instances.nodesSet.resetArcs(key);
        this.instances.renderer.changed();
    }

    private onNodeInteractiveTypesRemoved(key: string, types: Set<string> | string[]) {
        this.instances.legendUI?.remove(key, types);

        // Update Graph is needed
        this.instances.nodesSet.resetArcs(key);
        this.instances.renderer.changed();
    }

    private onNodeInteractiveColorChanged(key: string, type: string, color: Color.Color) {
        this.instances.nodesSet.updateTypeColor(key, type, color);
        this.instances.legendUI?.update(key, type, color);
        this.instances.renderer.changed();
    }

    // ================================= LINKS =================================

    private onLinkTypesAdded(colorMaps: Map<string, Color.Color>) {
        // Update UI
        if (this.instances.legendUI) {
            for (const [type, color] of colorMaps) {
                this.instances.legendUI.add(LINK_KEY, type, color);
            }
        }
        // Update Graph is needed
        if (this.instances.settings.interactiveSettings[LINK_KEY].enableByDefault) {
            colorMaps.forEach((color, type) => {
                this.instances.linksSet.updateTypeColor(LINK_KEY, type, color);
            });
            this.instances.renderer.changed();
        }
    }

    private onLinkTypesRemoved(types: Set<string> | string[]) {
        this.instances.legendUI?.remove(LINK_KEY, types);
    }

    private onLinkColorChanged(type: string, color: Color.Color) {
        this.instances.linksSet.updateTypeColor(LINK_KEY, type, color);
        this.instances.legendUI?.update(LINK_KEY, type, color);
        this.instances.renderer.changed();
    }

    // ================================ FOLDERS ================================

    private onFoldersAdded(colorMaps: Map<string, Color.Color>) {
        // Update UI
        if (this.instances.foldersUI) {
            for (const [path, color] of colorMaps) {
                this.instances.foldersUI.add(FOLDER_KEY, path, color);
            }
        }
        // Update Graph is needed
        if (this.instances.settings.interactiveSettings[FOLDER_KEY].enableByDefault && this.instances.foldersSet) {
            for (const [path, color] of colorMaps) {
                this.instances.foldersSet.loadFolder(FOLDER_KEY, path);
            }
            this.instances.renderer.changed();
        }
    }

    private onFoldersRemoved(paths: Set<string> | string[]) {
        this.instances.foldersUI?.remove(FOLDER_KEY, paths);

        for (const path of paths) {
            this.removeBBox(path);
        }
    }

    private onFolderColorChanged(path: string, color: Color.Color) {
        if (!this.instances.foldersSet) return;
        this.instances.foldersSet.updateColor(FOLDER_KEY, path);
        this.instances.foldersUI?.update(FOLDER_KEY, path, color);
        this.instances.renderer.changed();
    }

    private disableFolders(paths: string[]) {
        this.listenStage = false;
        for (const path of paths) {
            this.removeBBox(path);
        }
        this.listenStage = true;
    }

    private enableFolders(paths: string[]) {
        this.listenStage = false;
        for (const path of paths) {
            this.addBBox(path);
        }
        this.listenStage = true;
    }

    private addBBox(path: string) {
        if (!this.instances.foldersSet) return;
        this.instances.foldersSet.loadFolder(FOLDER_KEY, path);
        this.instances.renderer.changed();
    }

    private removeBBox(path: string) {
        if (!this.instances.foldersSet) return;
        this.instances.foldersSet.removeFolder(path);
        this.instances.renderer.changed();
    }

    // ================================ STATES =================================

    changeState(stateID: string) {
        this.setLastFilteringActionAsStateChange(stateID);
        PluginInstances.statesManager.changeState(this.instances, stateID);
    }

    // ================================== CSS ==================================

    private createStyleElementsForCSSBridge(): void {
        if (!this.instances.settings.enableCSS) return;
        if (!PluginInstances.app.customCss.enabledSnippets.has(PluginInstances.settings.cssSnippetFilename)) return;

        // Get the document inside the iframe
        const doc = this.instances.renderer.iframeEl.contentDocument;
        if (!doc) return;

        // Remove existing styling, just in case
        this.removeStylingForCSSBridge();

        // Add the styling elements
        this.instances.coreStyleEl = doc.createElement("style");
        this.instances.coreStyleEl.setAttribute('type', "text/css");
        doc.head.appendChild(this.instances.coreStyleEl);

        this.instances.extendedStyleEl = doc.createElement("style");
        this.instances.extendedStyleEl.setAttribute('type', "text/css");
        doc.head.appendChild(this.instances.extendedStyleEl);

        // Compute
        this.computeStylingFromCSSBridge();
    }

    private computeStylingFromCSSBridge(): void {
        applyCSSStyle(this.instances);

        this.instances.stylesData = {
            nodeText: getNodeTextStyle(this.instances),
            folder: getFolderStyle(this.instances)
        }
    }

    private removeStylingForCSSBridge(): void {
        this.instances.coreStyleEl?.remove();
        this.instances.extendedStyleEl?.remove();
    }

    onCSSChange() {
        this.computeStylingFromCSSBridge();
        if (this.instances.nodesSet) {
            this.instances.nodesSet.onCSSChange();
            this.instances.linksSet.onCSSChange();
            if (this.instances.settings.enableCSS) {
                this.instances.foldersSet?.onCSSChange();
            }
            this.instances.renderer.changed();
        }
    }
}