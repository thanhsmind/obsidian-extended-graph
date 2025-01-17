import { Component, Menu, TAbstractFile, TFile } from "obsidian";
import { Graph } from "./graph";
import { LegendUI } from "../ui/legendUI";
import { ViewsUI } from "../ui/viewsUI";
import { GraphsManager } from "src/graphsManager";
import { WorkspaceLeafExt } from "src/types/leaf";
import { FOLDER_KEY, LINK_KEY } from "src/globalVariables";
import { ExtendedGraphSettings } from "src/settings/settings";
import { GraphViewData } from "src/views/viewData";
import { FederatedPointerEvent } from "pixi.js";

export class GraphEventsDispatcher extends Component {
    type: string;

    graphsManager: GraphsManager;
    graph: Graph;
    leaf: WorkspaceLeafExt;
    observerOrphans: MutationObserver;

    legendUI: LegendUI | null = null;
    viewsUI: ViewsUI;

    renderCallback: () => void;

    listenStage: boolean = true;

    // ============================== CONSTRUCTOR ==============================

    /**
     * Constructor for GraphEventsDispatcher.
     * @param leaf - The workspace leaf.
     * @param graphsManager - The graphs manager.
     */
    constructor(leaf: WorkspaceLeafExt, graphsManager: GraphsManager) {
        super();
        this.leaf = leaf;
        this.graphsManager = graphsManager;
        this.initializeUI();
    }

    private initializeUI(): void {
        this.graph = new Graph(this);
        this.addChild(this.graph);

        this.initializeLegendUI();
        this.initializeFoldersUI();

        this.viewsUI = new ViewsUI(this);
        this.viewsUI.updateViewsList(this.graphsManager.plugin.settings.views);
        this.addChild(this.viewsUI);
    }

    private initializeLegendUI(): void {
        const settings = this.graphsManager.plugin.settings;
        if (settings.enableLinks || settings.enableTags || this.hasAdditionalProperties(settings)) {
            this.legendUI = new LegendUI(this);
            this.addChild(this.legendUI);
        }
    }

    private initializeFoldersUI(): void {
        const foldersManager = this.graph.folderBlobs.manager;
        if (!foldersManager) return;
        this.graphsManager.globalUIs.get(this.leaf.id)?.control.addSectionFolder(foldersManager);
    }

    private hasAdditionalProperties(settings: ExtendedGraphSettings): boolean {
        return Object.values(settings.additionalProperties).some(p => p);
    }

    // ================================ LOADING ================================

    /**
     * Called when the component is loaded.
     */
    onload(): void {
        this.loadCurrentView();
    }

    private loadCurrentView(): void {
        const view = this.graphsManager.plugin.settings.views.find(v => v.id === this.viewsUI.currentViewID);
        if (view) {
            this.graph.engine.setOptions(view.engineOptions);
        }
    }

    /**
     * Called when the graph is ready.
     */
    onGraphReady(): void {
        this.updateOpacityLayerColor();
        this.bindStageEvents();
        this.observeOrphanSettings();
        this.createRenderProxy();
        this.preventDraggingPinnedNodes();
        this.changeView(this.viewsUI.currentViewID);
    }

    private updateOpacityLayerColor(): void {
        if (this.graph.staticSettings.fadeOnDisable) {
            this.graph.nodesSet.updateOpacityLayerColor();
        }
    }

    private bindStageEvents(): void {
        this.onChildAddedToStage = this.onChildAddedToStage.bind(this);
        this.graph.renderer.px.stage.children[1].on('childAdded', this.onChildAddedToStage);

        this.onPointerDown = this.onPointerDown.bind(this);
        this.graph.renderer.px.stage.on('pointerdown', this.onPointerDown);
    }

    private observeOrphanSettings(): void {
        this.toggleOrphans = this.toggleOrphans.bind(this);
        const graphFilterControl = this.leaf.containerEl.querySelector(".tree-item.graph-control-section.mod-filter");
        if (graphFilterControl) {
            // @ts-ignore
            const orphanDesc = window.OBSIDIAN_DEFAULT_I18N.plugins.graphView.optionShowOrphansDescription;
            const listenToOrphanChanges = (function(treeItemChildren: HTMLElement) {
                const cb = treeItemChildren.querySelector(`.setting-item.mod-toggle:has([aria-label="${orphanDesc}"]) .checkbox-container`);
                cb?.addEventListener("click", this.toggleOrphans)
            }).bind(this);
            this.observerOrphans = new MutationObserver((mutations) => {
                if (mutations[0].addedNodes.length > 0) {
                    const treeItemChildren = mutations[0].addedNodes[0];
                    listenToOrphanChanges(treeItemChildren as HTMLElement);
                }
                else {
                    const treeItemChildren = mutations[0].removedNodes[0];
                    const cb = (treeItemChildren as HTMLElement).querySelector(`.setting-item.mod-toggle:has([aria-label="${orphanDesc}"]) .checkbox-container`);
                    cb?.removeEventListener("click", this.toggleOrphans)
                }
            })
            this.observerOrphans.observe(graphFilterControl, {childList: true});
            const treeItemChildren = graphFilterControl.querySelector(".tree-item-children");
            (treeItemChildren) && listenToOrphanChanges(treeItemChildren as HTMLElement);
        }
    }

    private createRenderProxy(): void {
        this.renderCallback = this.graph.renderer.renderCallback;
        const onRendered = this.onRendered.bind(this);
        this.graph.renderer.renderCallback = new Proxy(this.graph.renderer.renderCallback, {
            apply(target, thisArg, args) {
                const res = target.call(thisArg, ...args);
                onRendered();
                return res;
            }
        });
    }

    // =============================== UNLOADING ===============================

    /**
     * Called when the component is unloaded.
     */
    onunload(): void {
        this.unbindStageEvents();
        this.graph.renderer.renderCallback = this.renderCallback;
        this.observerOrphans.disconnect();
        this.graphsManager.onPluginUnloaded(this.leaf);
        this.unload();
    }

    private unbindStageEvents(): void {
        this.graph.renderer.px.stage.children[1].off('childAdded', this.onChildAddedToStage);
        this.graph.renderer.px.stage.off('pointerdown', this.onPointerDown);
    }

    // ============================= STAGE EVENTS ==============================

    /**
     * Called when a child is added to the stage by the engine.
     */
    private onChildAddedToStage(): void {
        if (!this.listenStage) return;
        if (this.graphsManager.isNodeLimitExceeded(this.leaf)) {
            this.graphsManager.disablePlugin(this.leaf);
            return;
        }

        this.loadAndConnectNodesAndLinks();
        //this.disableDisconnectedLinks();
    }

    private loadAndConnectNodesAndLinks(): void {
        this.graph.nodesSet.load();
        this.graph.nodesSet.connectNodes();
        this.graph.linksSet.load();
        this.graph.linksSet.connectLinks();
    }

    private disableDisconnectedLinks(): void {
        if (this.graph.linksSet.disconnectedLinks) {
            const linksToDisable = new Set<string>();
            for (const [cause, set] of Object.entries(this.graph.linksSet.disconnectedLinks)) {
                const linksToDisableForCause = new Set<string>();
                for (const id of set) {
                    const L = this.graph.linksSet.linksMap.get(id);
                    if (!L) continue;
                    if (this.graph.renderer.links.find(link => L?.link.source.id === link.source.id && L?.link.target.id === link.target.id)) {
                        linksToDisableForCause.add(id);
                        linksToDisable.add(id);
                    }
                }
                if (linksToDisableForCause.size > 0) {
                    this.graph.linksSet.disableLinks(linksToDisableForCause, cause);
                }
            }
            if (linksToDisable.size > 0) {
                this.graph.updateWorker();
            }
        }
    }

    private onPointerDown(): void {
        this.preventDraggingPinnedNodes();
    }

    // ============================ SETTINGS EVENTS ============================

    toggleOrphans(ev: Event) {
        if (this.graph.engine.options.showOrphans) {
            if (this.graph.enableOrphans()) {
                this.graph.updateWorker();
            }
        }
        else {
            if (this.graph.disableOrphans()) {
                this.graph.updateWorker();
            }
        }
    }

    // ============================= RENDER EVENTS =============================

    private onRendered() {
        console.log(this.graph.renderer.idleFrames);
        this.graph.folderBlobs.updateGraphics();
    }

    // ============================= INTERACTIVES ==============================

    /**
     * Handles the addition of interactive elements.
     * @param name - The name of the interactive element type.
     * @param colorMaps - A map of types to their corresponding colors.
     */
    onInteractivesAdded(name: string, colorMaps: Map<string, Uint8Array>) {
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
    onInteractivesRemoved(name: string, types: Set<string>) {
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
    onInteractiveColorChanged(key: string, type: string, color: Uint8Array) {
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
     * @param name - The name of the interactive element type.
     * @param types - An array of types to be disabled.
     */
    onInteractivesDisabled(name: string, types: string[]) {
        if (name === LINK_KEY) {
            this.disableLinkTypes(types);
        } else if (name === FOLDER_KEY) {
            this.disableFolders(types);
        } else {
            this.disableNodeInteractiveTypes(name, types);
        }
    }

    /**
     * Handles the enabling of interactive elements.
     * @param name - The name of the interactive element type.
     * @param types - An array of types to be enabled.
     */
    onInteractivesEnabled(name: string, types: string[]) {
        if (name === LINK_KEY) {
            this.enableLinkTypes(types);
        } else if (name === FOLDER_KEY) {
            this.enableFolders(types);
        } else {
            this.enableNodeInteractiveTypes(name, types);
        }
    }

    // ================================= TAGS ==================================

    // TAGS

    private onNodeInteractiveTypesAdded(key: string, colorMaps: Map<string, Uint8Array>) {
        this.graph.nodesSet.resetArcs(key);
        if (this.legendUI) {
            for (const [type, color] of colorMaps) {
                this.legendUI.addLegend(key, type, color);
            }
        }
        this.graph.renderer.changed();
    }

    private onNodeInteractiveTypesRemoved(key: string, types: Set<string>) {
        this.legendUI?.removeLegend(key, [...types]);
    }

    private onNodeInteractiveColorChanged(key: string, type: string, color: Uint8Array) {
        this.graph.nodesSet.updateArcsColor(key, type, color);
        this.legendUI?.updateLegend(key, type, color);
        this.graph.renderer.changed();
    }

    private disableNodeInteractiveTypes(key: string, types: string[]) {
        this.listenStage = false;
        if (this.graph.disableNodeInteractiveTypes(key, types)) {
            this.graph.updateWorker();
        }
        else {
            this.graph.renderer.changed();
        }
        this.listenStage = true;
    }

    private enableNodeInteractiveTypes(key: string, types: string[]) {
        this.listenStage = false;
        if (this.graph.enableNodeInteractiveTypes(key, types)) {
            this.graph.updateWorker();
        }
        else {
            this.graph.renderer.changed();
        }
        this.listenStage = true;
    }

    // ================================= LINKS =================================

    private onLinkTypesAdded(colorMaps: Map<string, Uint8Array>) {
        colorMaps.forEach((color, type) => {
            this.graph.linksSet.updateLinksColor(type, color);
            this.legendUI?.addLegend(LINK_KEY, type, color);
        });
        this.graph.renderer.changed();
    }

    private onLinkTypesRemoved(types: Set<string>) {
        this.legendUI?.removeLegend(LINK_KEY, [...types]);
    }

    private onLinkColorChanged(type: string, color: Uint8Array) {
        this.graph.linksSet.updateLinksColor(type, color);
        this.legendUI?.updateLegend(LINK_KEY, type, color);
        this.graph.renderer.changed();
    }

    private disableLinkTypes(types: string[]) {
        this.listenStage = false;
        if (this.graph.disableLinkTypes(types)) {
            this.graph.updateWorker();
        }
        this.listenStage = true;
    }

    private enableLinkTypes(types: string[]) {
        this.listenStage = false;
        if (this.graph.enableLinkTypes(types)) {
            this.graph.updateWorker();
        }
        this.listenStage = true;
    }

    // ================================ FOLDERS ================================

    private onFoldersAdded(colorMaps: Map<string, Uint8Array>) {
        this.graphsManager.globalUIs.get(this.leaf.id)?.control.sectionFolders.createFolders();
    }

    private onFoldersRemoved(paths: Set<string>) {
        this.graphsManager.globalUIs.get(this.leaf.id)?.control.sectionFolders.createFolders();
        for (const path of paths) {
            this.removeBBox(path);
        }
    }

    private onFolderColorChanged(path: string, color: Uint8Array) {
        this.graph.folderBlobs.updateColor(path);
        this.graphsManager.globalUIs.get(this.leaf.id)?.control.sectionFolders.setColor(path);
        this.graph.renderer.changed();
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
        this.graph.folderBlobs.addFolder(path);
        this.graph.renderer.changed();
    }

    private removeBBox(path: string) {
        this.graph.folderBlobs.removeFolder(path);
        this.graph.renderer.changed();
    }

    // ================================= VIEWS =================================

    /**
     * Change the current view with the specified ID.
     * @param id - The ID of the view to change to.
     */
    changeView(id: string) {
        const viewData = this.graphsManager.plugin.getViewDataById(id);
        if (!viewData) return;

        this.updateInteractiveManagers(viewData).then(() => {
            if (viewData.engineOptions) this.graph.engine.setOptions(viewData.engineOptions);
            this.graph.updateWorker();
            this.graph.nodesSet.setPinnedNodes(viewData.pinNodes ? viewData.pinNodes : {});
            this.graph.engine.updateSearch();
        });
    }

    private async updateInteractiveManagers(viewData: GraphViewData): Promise<void> {
        await setTimeout(() => {
            this.updateNodeManagers(viewData);
            this.updateLinkManager(viewData);
        }, 200);
    }

    private updateNodeManagers(viewData: GraphViewData): void {
        for (const [key, manager] of this.graph.nodesSet.managers) {
            manager.loadView(viewData);
            if (this.legendUI && viewData.disabledTypes) {
                this.legendUI.enableAll(key);
                if (viewData.disabledTypes.hasOwnProperty(key)) {
                    for (const type of viewData.disabledTypes[key]) {
                        this.legendUI.disable(key, type);
                    }
                }
            }
        }
    }
    
    private updateLinkManager(viewData: GraphViewData): void {
        if (this.graph.linksSet.linksManager) {
            this.graph.linksSet.linksManager.loadView(viewData);
            if (this.legendUI && viewData.disabledTypes) {
                this.legendUI.enableAll(LINK_KEY);
                for (const type of viewData.disabledTypes[LINK_KEY]) {
                    this.legendUI.disable(LINK_KEY, type);
                }
            }
        }
    }

    /**
     * Deletes the view with the specified ID.
     * @param id - The ID of the view to delete.
     */
    deleteView(id: string): void {
        this.graphsManager.onViewNeedsDeletion(id);
    }


    // =============================== PIN NODES ===============================

    onNodeMenuOpened(menu: Menu, file: TFile) {
        menu.addSections(['extended-graph']);
        menu.addItem(cb => {
            cb.setIcon("pin");
            if (this.graph.nodesSet.isNodePinned(file.path)) {
                cb.setTitle("Unpin node");
                cb.onClick(() => { this.unpinNode(file); });
            }
            else {
                cb.setTitle("Pin node");
                cb.onClick(() => { this.pinNode(file); });
            }
        })
    }

    private pinNode(file: TFile) {
        this.graph.nodesSet.pinNode(file.path);
    }

    private unpinNode(file: TFile) {
        this.graph.nodesSet.unpinNode(file.path);
        this.graph.renderer.changed();
    }

    preventDraggingPinnedNodes() {
        var i = this.graph.renderer.dragNode;
        if (i && this.graph.nodesSet.isNodePinned(i.id)) {
            this.graph.renderer.dragNode = null;
        }
    }
}