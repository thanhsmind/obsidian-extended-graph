import { Component, Menu, TFile } from "obsidian";
import { Graph } from "./graph";
import { LegendUI } from "../ui/legendUI";
import { ViewsUI } from "../ui/viewsUI";
import { GraphsManager } from "src/graphsManager";
import { WorkspaceLeafExt } from "src/types/leaf";
import { FOLDER_KEY, LINK_KEY } from "src/globalVariables";
import { ExtendedGraphSettings } from "src/settings/settings";
import { GCFolders } from "src/ui/graphControl/GCFolders";
import { Container, DisplayObject } from "pixi.js";
import { getLinkID } from "./extendedElements/extendedGraphLink";

export class GraphEventsDispatcher extends Component {
    type: string;

    graphsManager: GraphsManager;
    graph: Graph;
    leaf: WorkspaceLeafExt;
    observerOrphans: MutationObserver;

    legendUI: LegendUI | null = null;
    foldersUI: GCFolders | null = null;
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
        this.initializeGraph();
        this.initializeUI();
        this.initializeFoldersUI();
    }

    private initializeGraph(): void {
        this.graph = new Graph(this);
        this.addChild(this.graph);
    }

    private initializeUI(): void {
        this.initializeLegendUI();

        this.viewsUI = new ViewsUI(this.graph);
        this.viewsUI.updateViewsList(this.graphsManager.plugin.settings.views);
        this.addChild(this.viewsUI);
    }

    private initializeLegendUI(): void {
        const settings = this.graphsManager.plugin.settings;
        if (settings.enableFeatures['links'] || settings.enableFeatures['tags'] || this.hasAdditionalProperties(settings)) {
            this.legendUI = new LegendUI(this);
            this.addChild(this.legendUI);
        }
    }

    private initializeFoldersUI(): void {
        if (!this.graphsManager.plugin.settings.enableFeatures['folders']) return;

        const graphControls = this.graphsManager.globalUIs.get(this.leaf.id)?.control;
        if (!graphControls) return;

        const foldersManager = this.graph.folderBlobs.managers.get(FOLDER_KEY);
        if (!foldersManager) return;
        this.foldersUI = new GCFolders(this.leaf, this.graphsManager, foldersManager);
        this.foldersUI.display();
    }

    private hasAdditionalProperties(settings: ExtendedGraphSettings): boolean {
        return settings.enableFeatures['properties'] && Object.values(settings.additionalProperties).some(p => p);
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
        this.graphsManager.viewsManager.changeView(this.graph, this.viewsUI.currentViewID);
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

        this.onPointerUp = this.onPointerUp.bind(this);
        this.graph.renderer.px.stage.on('pointerup', this.onPointerUp);
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
                onRendered();
                const res = target.call(thisArg, ...args);
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
        this.graph.renderer.px.stage.off('pointerup', this.onPointerUp);
    }

    // ============================= STAGE EVENTS ==============================

    /**
     * Called when a child is added to the stage by the engine.
     */
    private onChildAddedToStage(child: DisplayObject, container: Container, index: number): void {
        if (!this.listenStage) return;
        if (this.graphsManager.isNodeLimitExceeded(this.leaf)) {
            this.graphsManager.disablePlugin(this.leaf);
            return;
        }
        
        const node = this.graph.renderer.nodes.find(n => n.circle === child);
        if (node) {
            console.log("Is a node", node.id);
            const extendedNode = this.graph.nodesSet.extendedElementsMap.get(node.id);
            if (!extendedNode) {
                this.graph.nodesSet.load();
            }
            else {
                extendedNode.setCoreElement(node);
            }
        }

        const linkPx = this.graph.renderer.links.find(l => l.px === child);
        if (linkPx) {
            const extendedLink = this.graph.linksSet.extendedElementsMap.get(getLinkID(linkPx));
            if (!extendedLink) {
                this.graph.linksSet.load();
            }
            else {
                extendedLink.setCoreElement(linkPx);
            }
        }
    }

    private onPointerDown(): void {
        this.preventDraggingPinnedNodes();
    }

    private onPointerUp(): void {
        this.pinDraggingPinnedNode();
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
        if (this.graph.staticSettings.enableFeatures['folders']) this.graph.folderBlobs.updateGraphics();
        if (this.graph.staticSettings.enableFeatures['links'] && this.graph.staticSettings.enableFeatures['curvedLinks']) {
            for (const id of this.graph.linksSet.connectedIDs) {
                this.graph.linksSet.extendedElementsMap.get(id)?.graphicsWrapper?.updateGraphics();
            }
        }
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
        // Update UI
        if (this.legendUI) {
            for (const [type, color] of colorMaps) {
                this.legendUI.add(key, type, color);
            }
        }
        // Update Graph is needed
        if (this.graph.dynamicSettings.interactiveSettings[key].enableByDefault) {
            this.graph.nodesSet.resetArcs(key);
            this.graph.renderer.changed();
        }
    }

    private onNodeInteractiveTypesRemoved(key: string, types: Set<string>) {
        this.legendUI?.remove(key, [...types]);
    }

    private onNodeInteractiveColorChanged(key: string, type: string, color: Uint8Array) {
        this.graph.nodesSet.updateTypeColor(key, type, color);
        this.legendUI?.update(key, type, color);
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
        // Update UI
        if (this.legendUI) {
            for (const [type, color] of colorMaps) {
                this.legendUI.add(LINK_KEY, type, color);
            }
        }
        // Update Graph is needed
        if (this.graph.dynamicSettings.interactiveSettings[LINK_KEY].enableByDefault) {
            colorMaps.forEach((color, type) => {
                this.graph.linksSet.updateTypeColor(LINK_KEY, type, color);
            });
            this.graph.renderer.changed();
        }
    }

    private onLinkTypesRemoved(types: Set<string>) {
        this.legendUI?.remove(LINK_KEY, [...types]);
    }

    private onLinkColorChanged(type: string, color: Uint8Array) {
        this.graph.linksSet.updateTypeColor(LINK_KEY, type, color);
        this.legendUI?.update(LINK_KEY, type, color);
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
        // Update UI
        if (this.foldersUI) {
            for (const [path, color] of colorMaps) {
                this.foldersUI.add(FOLDER_KEY, path, color);
            }
        }
        // Update Graph is needed
        if (this.graph.dynamicSettings.interactiveSettings[FOLDER_KEY].enableByDefault) {
            for (const [path, color] of colorMaps) {
                this.graph.folderBlobs.addFolder(FOLDER_KEY, path);
            }
            this.graph.renderer.changed();
        }
    }

    private onFoldersRemoved(paths: Set<string>) {
        this.foldersUI?.remove(FOLDER_KEY, [...paths]);

        for (const path of paths) {
            this.removeBBox(path);
        }
    }

    private onFolderColorChanged(path: string, color: Uint8Array) {
        this.graph.folderBlobs.updateColor(FOLDER_KEY, path);
        this.foldersUI?.update(FOLDER_KEY, path, color);
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
        this.graph.folderBlobs.addFolder(FOLDER_KEY, path);
        this.graph.renderer.changed();
    }

    private removeBBox(path: string) {
        this.graph.folderBlobs.removeFolder(path);
        this.graph.renderer.changed();
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
        var node = this.graph.renderer.dragNode;
        if (node && this.graph.nodesSet.isNodePinned(node.id)) {
            this.graph.nodesSet.setLastDraggedPinnedNode(node.id);
        }
    }

    pinDraggingPinnedNode() {
        this.graph.nodesSet.pinLastDraggedPinnedNode();
    }
}