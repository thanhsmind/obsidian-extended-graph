import { TFile } from "obsidian";
import { GraphNode } from "obsidian-typings";
import { Container, DisplayObject } from "pixi.js";
import { ExtendedGraphSettings, findClosestIndex, getFile, getFileInteractives, getLinkID } from "src/internal";
import { GraphInstances, PluginInstances } from "src/pluginInstances";

export interface Layer {
    id: string;
    label: string;
    level: number;
    nodes: string[];
    container: Container;
}

export interface LayerGroup {
    level: number;
    alpha: number;
    layers: Layer[];
}

export class LayersManager {
    layerGroups: LayerGroup[] = [];
    notInLayers: string[] = [];
    nodeLookup: Record<string, { group: LayerGroup, layer: Layer }> = {};
    graphicsArray: {
        circles: Set<DisplayObject>,
        names: Set<DisplayObject>,
        arrows: Set<DisplayObject>,
        links: Set<DisplayObject>,
        linksPixiElements: Set<DisplayObject>,
        linksContainer: Set<DisplayObject>,
    } = {
            circles: new Set(),
            names: new Set(),
            arrows: new Set(),
            links: new Set(),
            linksPixiElements: new Set(),
            linksContainer: new Set(),
        }
    instances: GraphInstances;
    currentLevel: number;
    isEnabled: boolean = false;

    constructor(instances: GraphInstances) {
        this.instances = instances;
        this.currentLevel = instances.stateData?.currentLayerLevel ?? 0;
    }

    rebuildContainers() {
        for (const group of this.layerGroups) {
            for (const layer of group.layers) {
                if (layer.container.destroyed) {
                    layer.container = this.getNewContainer(layer.id, layer.level);
                    layer.container.alpha = group.alpha;
                    for (const nodeID of layer.nodes) {
                        const node = this.instances.renderer.nodeLookup[nodeID];
                        if (node) {
                            this.addToContainer(node);
                        }
                    }
                }
            }
        }
    }

    // ============================== Add a node ===============================

    addNode(nodeID: string) {
        if (this.nodeLookup[nodeID]) {
            if (this.isEnabled) {
                const node = this.instances.renderer.nodeLookup[nodeID];
                if (node) {
                    this.addToContainer(node);
                }
            }
            return;
        }

        const file = getFile(nodeID);
        if (file) {
            const { layerID, parsed } = LayersManager.getNodeLayer(file, this.instances.settings);
            if (layerID && parsed) {
                // Add the node id to the layers
                let group = this.layerGroups.find(group => group.level === parsed.level);
                let layer = group?.layers.find(layer => layer.id === layerID);
                if (group && layer) {
                    layer.nodes.push(nodeID);
                }
                else {
                    if (!group) {
                        group = {
                            level: parsed.level,
                            layers: [],
                            alpha: 1,
                        };
                        this.layerGroups.push(group);
                    }
                    layer = {
                        id: layerID,
                        label: parsed.label,
                        level: parsed.level,
                        nodes: [nodeID],
                        container: this.getNewContainer(layerID, parsed.level),
                    };
                    group.layers.push(layer);
                }
                this.nodeLookup[nodeID] = { group, layer };

                return;
            }
        }

        this.notInLayers.push(nodeID);
    }

    private getNewContainer(id: string, level: number): Container {
        const container = new Container();
        container.name = "layer-" + id;
        container.zIndex = this.instances.settings.layersOrder === "ASC" ? level : -1 * level;
        this.instances.renderer.hanger.addChild(container);
        return container;
    }


    // ==================== Fill up or fill out containers =====================


    private moveElementsInContainers() {
        for (const nodeID in this.nodeLookup) {
            const node = this.instances.renderer.nodeLookup[nodeID];
            if (node) {
                this.addToContainer(node);
            }
        }
    }

    private addToContainer(node: GraphNode) {
        const sourceLayer = this.nodeLookup[node.id].layer;
        if (!sourceLayer) return;

        const add = (element: DisplayObject, layer: Layer, array: keyof typeof this.graphicsArray, at?: number): void => {
            if (!element.destroyed && element.parent
                && (element.parent === this.instances.renderer.hanger
                    || (element.parent.name?.startsWith("layer-") && element.parent !== layer.container)
                )
            ) {
                at !== undefined ? layer.container.addChildAt(element, at) : layer.container.addChild(element);
                this.graphicsArray[array].add(element);
                element.on('destroyed', () => {
                    this.graphicsArray[array].delete(element);
                });
            }
        }

        // Add the node to the container
        if (node.circle) { add(node.circle, sourceLayer, 'circles'); }
        if (node.text) { add(node.text, sourceLayer, 'names'); }

        // Add links
        // @ts-ignore
        for (const link of Object.values(node.forward).concat(Object.values(node.reverse)).map(link => link as GraphLink)) {
            const linkID = getLinkID(link);
            const extendedLink = this.instances.linksSet.extendedElementsMap.get(linkID);

            const targetLayer = this.nodeLookup[link.target.id]?.layer;
            const layer = targetLayer
                ? targetLayer.level < sourceLayer.level && this.instances.settings.layersOrder === "ASC"
                    ? targetLayer
                    : sourceLayer
                : sourceLayer;

            if (!extendedLink?.container) {
                const pixiElement = extendedLink?.graphicsWrapper?.pixiElement;
                if (pixiElement) { add(pixiElement, layer, 'linksPixiElements', 0); }
                if (link.arrow) { add(link.arrow, layer, 'arrows', 0); }
                if (link.px) { add(link.px, layer, 'links', 0); }
            }
            else {
                if (extendedLink.container) { add(extendedLink.container, layer, 'linksContainer', 0); }
            }
        }
    }

    private moveElementsOutOfContainers() {
        // Make sure we add them back in the correct order
        for (const element of this.graphicsArray.links) {
            this.instances.renderer.hanger.addChild(element);
        }
        for (const element of this.graphicsArray.arrows) {
            this.instances.renderer.hanger.addChild(element);
        }
        for (const element of this.graphicsArray.linksPixiElements) {
            this.instances.renderer.hanger.addChild(element);
        }
        for (const element of this.graphicsArray.linksContainer) {
            this.instances.renderer.hanger.addChild(element);
        }
        for (const element of this.graphicsArray.circles) {
            this.instances.renderer.hanger.addChild(element);
        }
        for (const element of this.graphicsArray.names) {
            this.instances.renderer.hanger.addChild(element);
        }

        this.graphicsArray.links.clear();
        this.graphicsArray.arrows.clear();
        this.graphicsArray.linksPixiElements.clear();
        this.graphicsArray.linksContainer.clear();
        this.graphicsArray.circles.clear();
        this.graphicsArray.names.clear();
    }

    // ========================= Change current level ==========================

    increaseCurrentLevel(): void {
        const currentIndex = this.getCurrentIndex();
        if (currentIndex === this.layerGroups.length - 1) return;
        this.setCurrentLevel(this.layerGroups[currentIndex + 1].level);
    }

    decreaseCurrentLevel(): void {
        const currentIndex = this.getCurrentIndex();
        if (currentIndex === 0) return;
        this.setCurrentLevel(this.layerGroups[currentIndex - 1].level);
    }

    setCurrentLevel(n: number, render = true): void {
        this.currentLevel = n;
        if (this.isEnabled) {
            this.updateOpacity();
            if (render) this.instances.engine.render();
            this.instances.layersUI?.updateCurrentLevelUI(this.getCurrentIndex());
        }
    }

    getCurrentIndex(): number {
        return findClosestIndex(this.layerGroups.map(group => group.level), this.currentLevel);
    }

    // ================== Recompute layers order and opacity ===================

    private updateLayers(): void {
        if (!this.isEnabled) return;
        this.sortLayers();
        this.updateOpacity();
        this.updateUI();
    }

    private sortLayers(): void {
        this.layerGroups.sort((a, b) =>
            a.level - b.level
        );
        if (this.instances.settings.layersOrder === "DESC") {
            this.layerGroups.reverse();
        }
    }

    private updateOpacity(): void {
        const currentIndex = this.getCurrentIndex();
        for (let i = 0; i < this.layerGroups.length; i++) {
            this.layerGroups[i].alpha = this.getOpacity(currentIndex, i);
            for (const layer of this.layerGroups[i].layers) {
                layer.container.alpha = this.layerGroups[i].alpha;
            }
        }
    }

    private getOpacity(currentIndex: number, index: number): number {
        // If the index is out of range, return 0
        const shift = index - currentIndex;
        if (shift < 0 || shift >= this.instances.settings.numberOfActiveLayers) {
            return 0;
        }

        if (!this.instances.settings.useLayerCustomOpacity) {
            return (this.instances.settings.numberOfActiveLayers - shift) / this.instances.settings.numberOfActiveLayers;
        }

        // If a custom opacity is set for the level, use it
        const level = this.layerGroups[index].level;
        if (level in this.instances.settings.layersCustomOpacity) {
            return this.instances.settings.layersCustomOpacity[level];
        }

        // Interpolate between the two closests custom opacity
        const activeLayers = this.layerGroups.slice(currentIndex, currentIndex + this.instances.settings.numberOfActiveLayers);
        let lowestBound = {
            opacity: 1,
            index: 0,
        };
        for (let i = shift; i >= 0; i--) {
            if (activeLayers[i].level in this.instances.settings.layersCustomOpacity) {
                lowestBound = {
                    opacity: this.instances.settings.layersCustomOpacity[activeLayers[i].level],
                    index: i,
                };
                break;
            }
        }
        let highestBound = {
            opacity: 0,
            index: this.instances.settings.numberOfActiveLayers,
        };
        for (let i = shift; i < activeLayers.length; i++) {
            if (activeLayers[i].level in this.instances.settings.layersCustomOpacity) {
                highestBound = {
                    opacity: this.instances.settings.layersCustomOpacity[activeLayers[i].level],
                    index: i,
                };
                break;
            }
        }

        const f = (shift - lowestBound.index) / (highestBound.index - lowestBound.index);
        return (1 - f) * lowestBound.opacity + f * highestBound.opacity;
    }

    private updateUI(): void {
        this.instances.layersUI?.updateLevels(this.layerGroups);
        this.instances.layersUI?.updateCurrentLevelUI(this.getCurrentIndex());
    }

    // ============================ Enable/Disable =============================

    enable() {
        this.isEnabled = true;
        this.instances.layersUI?.open();
        this.moveElementsInContainers();
        this.updateLayers();
        this.instances.engine.render();
    }

    disable() {
        this.isEnabled = false;
        this.moveElementsOutOfContainers();
        this.instances.layersUI?.close();
        this.instances.engine.render();
    }

    // ================================ Unload =================================

    unload(): void {
        this.isEnabled = false;
        this.moveElementsOutOfContainers();
        for (const group of this.layerGroups) {
            for (const layer of group.layers) {
                layer.container.removeFromParent();
                layer.container.destroy();
            }
        }
        this.layerGroups = [];
    }

    // ================================ Static =================================

    static parseLayerID(layerID: string): { level: number, label: string } | undefined {
        const words = layerID.split("_");
        if (words.length === 0) return;
        const level = parseInt(words[0]);
        const label = words.length > 1 ? words.slice(1).join("_") : "";
        if (isNaN(level)) return;
        return { level, label };
    }

    static getNodeLayer(file: TFile, settings: ExtendedGraphSettings): {
        layerID?: string;
        parsed?: {
            level: number;
            label: string;
        };
    } {
        for (const property of settings.layerProperties.filter(p => p !== "")) {
            const values = getFileInteractives(property, file, settings);
            for (const layerID of values) {
                const parsed = LayersManager.parseLayerID(layerID);
                if (!parsed) continue;

                return { layerID, parsed };
            }
        }
        return {};
    }

    static getAllLayers(settings: ExtendedGraphSettings): { level: number, labels: string[] }[] {
        const files = PluginInstances.app.vault.getMarkdownFiles();
        const results: { level: number, labels: string[] }[] = [];
        for (const file of files) {
            LayersManager.addLayerIfNeeded(settings, results, file);
        }
        LayersManager.sortData(settings, results);
        return results;
    }

    static sortData(settings: ExtendedGraphSettings, data: { level: number, labels: string[] }[]) {
        for (const layer of data) {
            layer.labels = layer.labels.unique().sort();
        }
        data.sort((a, b) => a.level - b.level);
        if (settings.layersOrder === "DESC") {
            data.reverse();
        }
    }

    static addLayerIfNeeded(settings: ExtendedGraphSettings, results: { level: number, labels: string[] }[], file: TFile) {
        const { layerID, parsed } = LayersManager.getNodeLayer(file, settings);
        if (layerID && parsed) {
            let found = results.find(layer => layer.level === parsed.level);
            if (!found) {
                found = {
                    level: parsed.level,
                    labels: []
                };
                results.push(found);
            }
            found.labels.push(parsed.label);
        }
    }
}