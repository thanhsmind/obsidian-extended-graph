import { Component, Menu, TFile } from "obsidian";
import { GraphData, GraphLink } from "obsidian-typings";
import { Container, DisplayObject, Graphics, Text } from "pixi.js";
import { ExtendedGraphSettings, FOLDER_KEY, GCFolders, getFile, getFileInteractives, getLinkID, getOutlinkTypes, Graph, GraphInstances, isGraphBannerView, LegendUI, LINK_KEY, Pinner, PluginInstances, StatesUI, TAG_KEY } from "src/internal";
import STRINGS from "src/Strings";

export class GraphEventsDispatcher extends Component {

    instances: GraphInstances;

    listenStage: boolean = true;

    // ============================== CONSTRUCTOR ==============================

    /**
     * Constructor for GraphEventsDispatcher.
     * @param leaf - The workspace leaf.
     * @param graphsManager - The graphs manager.
     */
    constructor(instances: GraphInstances) {
        super();
        this.instances = instances;
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
        this.instances.foldersUI = new GCFolders(this.instances.view, foldersManager);
        this.instances.foldersUI.display();
    }

    private hasAdditionalProperties(settings: ExtendedGraphSettings): boolean {
        return settings.enableFeatures[this.instances.type]['properties'] && Object.values(settings.additionalProperties).some(p => p);
    }

    // ================================ LOADING ================================

    /**
     * Called when the component is loaded.
     */
    onload(): void {
        this.loadCurrentState();
    }

    private loadCurrentState(): void {
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
        this.updateOpacityLayerColor();
        this.bindStageEvents();

        try {
            this.createRenderCallbackProxy();
            this.createInitGraphicsProxy();
            this.createDestroyGraphicsProxy();
            this.createSetDataProxy();
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


        this.preventDraggingPinnedNodes();
        PluginInstances.statesManager.changeState(this.instances, this.instances.statesUI.currentStateID);
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

        this.onPointerDown = this.onPointerDown.bind(this);
        this.instances.renderer.px.stage.on('pointerdown', this.onPointerDown);

        this.onPointerUp = this.onPointerUp.bind(this);
        this.instances.renderer.px.stage.on('pointerup', this.onPointerUp);
    }

    private createRenderCallbackProxy(): void {
        const onRendered = this.onRendered.bind(this);
        PluginInstances.proxysManager.registerProxy<typeof this.instances.renderer.renderCallback>(
            this.instances.renderer,
            "renderCallback",
            {
                apply(target, thisArg, args) {
                    onRendered();
                    return Reflect.apply(target, thisArg, args);
                }
            }
        );
    }

    private createSetDataProxy() {
        const updateData = this.updateData.bind(this);
        PluginInstances.proxysManager.registerProxy<typeof this.instances.renderer.setData>(
            this.instances.renderer,
            "setData",
            {
                apply(target, thisArg, args) {
                    args[0] = updateData(args[0]);
                    return Reflect.apply(target, thisArg, args);
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

    // =============================== UNLOADING ===============================

    /**
     * Called when the component is unloaded.
     */
    onunload(): void {
        this.unbindStageEvents();
        PluginInstances.proxysManager.unregisterProxy(this.instances.renderer.renderCallback);
        PluginInstances.proxysManager.unregisterProxy(this.instances.renderer.setData);
        PluginInstances.proxysManager.unregisterProxy(this.instances.renderer.destroyGraphics);
        PluginInstances.proxysManager.unregisterProxy(this.instances.renderer.initGraphics);
        this.instances.foldersUI?.destroy();
        PluginInstances.graphsManager.onPluginUnloaded(this.instances.view);
    }

    private unbindStageEvents(): void {
        this.instances.renderer.hanger.off('childAdded', this.onChildAddedToStage);
        this.instances.renderer.hanger.off('childRemoved', this.onChildRemovedFromStage);
        this.instances.renderer.px.stage.off('pointerdown', this.onPointerDown);
        this.instances.renderer.px.stage.off('pointerup', this.onPointerUp);
    }

    // ============================= STAGE EVENTS ==============================

    /**
     * Called when a child is added to the stage by the engine.
     */
    private onChildAddedToStage(child: DisplayObject, container: Container, index: number): void {
        if (!this.listenStage) return;
        if (PluginInstances.graphsManager.isNodeLimitExceeded(this.instances.view)) {
            this.listenStage = false;
            setTimeout(() => {
                PluginInstances.graphsManager.disablePluginFromLeafID(this.instances.view.leaf.id);
            }, 200);
            return;
        }

        const node = this.instances.renderer.nodes.find(n => n.circle === child);
        if (node) {
            const extendedNode = this.instances.nodesSet.extendedElementsMap.get(node.id);
            if (!extendedNode) {
                this.instances.nodesSet.load();
            }
            else {
                extendedNode.setCoreElement(node);
            }
            const file = getFile(node.id);
            if (file) {
                const paths = getFileInteractives(FOLDER_KEY, file);
                for (const path of paths) {
                    this.instances.foldersSet?.loadFolder(FOLDER_KEY, path);
                }
            }
        }

        const link = this.instances.renderer.links.find(l => l.px === child || l.arrow === child);
        if (link) {
            const add = (l: GraphLink) => {
                const extendedLink = this.instances.linksSet.extendedElementsMap.get(getLinkID(l));
                if (!extendedLink) {
                    this.instances.linksSet.load();
                }
                else {
                    extendedLink.setCoreElement(l);
                }
            }
            const canAdd = (l: GraphLink) => {
                return l.line && (!this.instances.renderer.fShowArrow || !!l.arrow);
            }
            if (canAdd(link)) {
                add(link);
            }
            else {
                child.on('childAdded', (child2: DisplayObject, container2: Container<DisplayObject>, index2: number) => {
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

    private onPointerDown(): void {
        this.preventDraggingPinnedNodes();
    }

    private onPointerUp(): void {
        this.pinDraggingPinnedNode();
    }

    private updateData(data: GraphData): GraphData {
        // Filter out nodes
        let nodesToRemove: string[] = [];
        if (!this.instances.settings.fadeOnDisable) {
            for (const [id, node] of Object.entries(data.nodes)) {
                // Remove file nodes
                const file = getFile(id);
                if (file) {
                    for (const [key, manager] of this.instances.nodesSet.managers) {
                        const interactives = getFileInteractives(key, file);
                        if (interactives.size > 0 && ![...interactives].some(interactive => manager.isActive(interactive))) {
                            nodesToRemove.push(id);
                        }
                        if (interactives.size === 0 && !manager.isActive(this.instances.settings.interactiveSettings[key].noneType)) {
                            nodesToRemove.push(id);
                        }
                    }
                }

                // Remove tag nodes
                else if (node.type === 'tag' && this.instances.settings.enableFeatures[this.instances.type]['tags']) {
                    const manager = this.instances.interactiveManagers.get(TAG_KEY);
                    if (manager && !manager.isActive(id.replace('#', ''))) {
                        nodesToRemove.push(id);
                    }
                }
            }
        }

        for (const id of nodesToRemove) {
            delete data.nodes[id];
        }
        nodesToRemove = [];

        // Filter out links
        for (const [source, node] of Object.entries(data.nodes)) {
            const file = getFile(source);
            if (file) {
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

                        if (types.size > 0 && ![...types].some(type => manager.isActive(type))) {
                            // We can remove directly from the record since we are not iterating over the record
                            delete node.links[target];

                            // Remove source or target if settings enabled
                            if (this.instances.settings.enableFeatures[this.instances.type]['source']) {
                                nodesToRemove.push(source);
                            }
                            if (this.instances.settings.enableFeatures[this.instances.type]['target']) {
                                nodesToRemove.push(target);
                            }
                        }
                    }

                    if (!manager.isActive(this.instances.settings.interactiveSettings[manager.name].noneType)) {
                        const noneTargets = Object.keys(node.links).filter(target => !validTypedLinks.has(target));
                        for (const target of noneTargets) {
                            delete node.links[target];
                        }
                    }
                }
            }

            // Actually remove source and targets
            for (const id of nodesToRemove) {
                delete data.nodes[id];
            }
            nodesToRemove = [];
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

    private afterInitGraphics() {
        setTimeout(() => {
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

    private onRendered() {
        // If the color groups have changed, recolor the nodes and reset to false once it's done
        /*if (this.instances.colorGroupHaveChanged) {
            for (const [id, extendedElement] of this.instances.nodesSet.extendedElementsMap) {
                extendedElement.graphicsWrapper?.updateFillColor();
            }
            this.instances.colorGroupHaveChanged = false;
        }*/

        // If nodes need to be pinned because we just changed the state and new nodes were added
        if (this.instances.statePinnedNodes) {
            const pinner = new Pinner(this.instances);
            pinner.setPinnedNodesFromState();
        }

        // Update the graphics of folders in order to redraw the box when nodes move
        if (this.instances.foldersSet) this.instances.foldersSet.updateGraphics();

        // Update the graphics of the links
        if (this.instances.settings.enableFeatures[this.instances.type]['links'] && this.instances.settings.interactiveSettings[LINK_KEY].showOnGraph) {
            for (const id of this.instances.linksSet.connectedIDs) {
                this.instances.linksSet.extendedElementsMap.get(id)?.graphicsWrapper?.pixiElement.updateFrame();
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
            this.instances.graph.disableLinkTypes(types);
            this.instances.engine.render();
        } else if (name === FOLDER_KEY) {
            this.disableFolders(types);
        } else {
            this.instances.graph.disableNodeInteractiveTypes(name, types);
            if (!this.instances.settings.fadeOnDisable) {
                this.instances.engine.render();
            }
            this.instances.renderer.changed();
        }
    }

    /**
     * Handles the enabling of interactive elements.
     * @param name - The name of the interactive element type.
     * @param types - An array of types to be enabled.
     */
    onInteractivesEnabled(name: string, types: string[]) {
        if (name === LINK_KEY) {
            this.instances.graph.enableLinkTypes(types);
            this.instances.engine.render();
        } else if (name === FOLDER_KEY) {
            this.enableFolders(types);
        } else {
            this.instances.graph.enableNodeInteractiveTypes(name, types);
            if (!this.instances.settings.fadeOnDisable) {
                this.instances.engine.render();
            }
            this.instances.renderer.changed();
        }
    }

    // ================================= TAGS ==================================

    // TAGS

    private onNodeInteractiveTypesAdded(key: string, colorMaps: Map<string, Uint8Array>) {
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

    private onNodeInteractiveColorChanged(key: string, type: string, color: Uint8Array) {
        this.instances.nodesSet.updateTypeColor(key, type, color);
        this.instances.legendUI?.update(key, type, color);
        this.instances.renderer.changed();
    }

    // ================================= LINKS =================================

    private onLinkTypesAdded(colorMaps: Map<string, Uint8Array>) {
        // Update UI
        if (this.instances.legendUI) {
            for (const [type, color] of colorMaps) {
                this.instances.legendUI.add(LINK_KEY, type, color);
            }
        }
        // Update Graph is needed
        if (PluginInstances.settings.interactiveSettings[LINK_KEY].enableByDefault) {
            colorMaps.forEach((color, type) => {
                this.instances.linksSet.updateTypeColor(LINK_KEY, type, color);
            });
            this.instances.renderer.changed();
        }
    }

    private onLinkTypesRemoved(types: Set<string> | string[]) {
        this.instances.legendUI?.remove(LINK_KEY, types);
    }

    private onLinkColorChanged(type: string, color: Uint8Array) {
        this.instances.linksSet.updateTypeColor(LINK_KEY, type, color);
        this.instances.legendUI?.update(LINK_KEY, type, color);
        this.instances.renderer.changed();
    }

    // ================================ FOLDERS ================================

    private onFoldersAdded(colorMaps: Map<string, Uint8Array>) {
        // Update UI
        if (this.instances.foldersUI) {
            for (const [path, color] of colorMaps) {
                this.instances.foldersUI.add(FOLDER_KEY, path, color);
            }
        }
        // Update Graph is needed
        if (PluginInstances.settings.interactiveSettings[FOLDER_KEY].enableByDefault && this.instances.foldersSet) {
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

    private onFolderColorChanged(path: string, color: Uint8Array) {
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


    // =============================== PIN NODES ===============================

    onNodeMenuOpened(menu: Menu, file: TFile) {
        menu.addSections(['extended-graph']);
        menu.addItem(cb => {
            cb.setIcon("pin");
            if (this.instances.nodesSet.isNodePinned(file.path)) {
                cb.setTitle(STRINGS.features.unpinNode);
                cb.onClick(() => { this.unpinNode(file); });
            }
            else {
                cb.setTitle(STRINGS.features.pinNode);
                cb.onClick(() => { this.pinNode(file); });
            }
        })
    }

    private pinNode(file: TFile) {
        const pinner = new Pinner(this.instances);
        pinner.pinNode(file.path);
    }

    private unpinNode(file: TFile) {
        const pinner = new Pinner(this.instances);
        pinner.unpinNode(file.path);
        this.instances.renderer.changed();
    }

    preventDraggingPinnedNodes() {
        const node = this.instances.renderer.dragNode;
        if (node && this.instances.nodesSet.isNodePinned(node.id)) {
            const pinner = new Pinner(this.instances);
            pinner.setLastDraggedPinnedNode(node.id);
        }
    }

    pinDraggingPinnedNode() {
        const pinner = new Pinner(this.instances);
        pinner.pinLastDraggedPinnedNode();
    }
}