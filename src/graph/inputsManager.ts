import { Keymap, Menu, TFile, UserEvent } from "obsidian";
import { Pinner, RadialMenuManager, t } from "src/internal";
import { GraphInstances, PluginInstances } from "src/pluginInstances";

export class InputsManager {
    instances: GraphInstances;
    coreOnNodeClick?: (e: UserEvent | null, id: string, type: string) => void;
    coreOnNodeRightClick?: (e: UserEvent | null, id: string, type: string) => void;

    constructor(instances: GraphInstances) {
        this.instances = instances;

        this.bindStageEvents();
        this.changeNodeOnClick();
        this.preventDraggingPinnedNodes();
    }


    private bindStageEvents(): void {
        this.onPointerDown = this.onPointerDown.bind(this);
        this.instances.renderer.px.stage.on('pointerdown', this.onPointerDown);

        this.onPointerUp = this.onPointerUp.bind(this);
        this.instances.renderer.px.stage.on('pointerup', this.onPointerUp);
    }

    private changeNodeOnClick(): void {
        if (this.instances.settings.openInNewTab) {
            this.onNodeClick = this.onNodeClick.bind(this);
            this.coreOnNodeClick = this.instances.renderer.onNodeClick;
            this.instances.renderer.onNodeClick = this.onNodeClick;
        }

        if (this.instances.settings.useRadialMenu) {
            this.onNodeRightClick = this.onNodeRightClick.bind(this);
            this.coreOnNodeRightClick = this.instances.renderer.onNodeRightClick;
            this.instances.renderer.onNodeRightClick = this.onNodeRightClick;
        }
    }

    private onPointerDown(): void {
        this.preventDraggingPinnedNodes();
    }

    private onPointerUp(): void {
        this.pinDraggingPinnedNode();
    }

    private onNodeClick(e: UserEvent | null, id: string, type: string): void {
        if ("tag" !== type)
            PluginInstances.app.workspace.openLinkText(id, "", "tab");
        else {
            if (this.coreOnNodeClick) this.coreOnNodeClick(e, id, type);
        }
    }

    private onNodeRightClick(e: MouseEvent | null, id: string, type: string): void {
        if (e && Keymap.isModifier(e, "Shift")) {
            const radialMenu = new RadialMenuManager(this.instances, id, type);
            radialMenu.open(e);
            return;
        }

        if (this.coreOnNodeRightClick) this.coreOnNodeRightClick(e, id, type);
    }

    // =============================== UNLOADING ===============================

    unload() {
        this.instances.renderer.px.stage.off('pointerdown', this.onPointerDown);
        this.instances.renderer.px.stage.off('pointerup', this.onPointerUp);
        this.restoreOnNodeClick();
    }

    private restoreOnNodeClick(): void {
        if (this.coreOnNodeClick) {
            this.instances.renderer.onNodeClick = this.coreOnNodeClick;
            this.coreOnNodeClick = undefined;
        }
        if (this.coreOnNodeRightClick) {
            this.instances.renderer.onNodeRightClick = this.coreOnNodeRightClick;
            this.coreOnNodeRightClick = undefined;
        }
    }

    // =============================== PIN NODES ===============================

    onNodeMenuOpened(menu: Menu, file: TFile) {
        menu.addSections(['extended-graph']);
        menu.addItem(cb => {
            cb.setIcon("pin");
            if (this.instances.nodesSet.isNodePinned(file.path)) {
                cb.setTitle(t("features.unpinNode"));
                cb.onClick(() => { this.unpinNode(file); });
            }
            else {
                cb.setTitle(t("features.pinNode"));
                cb.onClick(() => { this.pinNode(file); });
            }
        })
    }

    private pinNode(file: TFile) {
        const pinner = new Pinner(this.instances);
        pinner.pinNode(file.path);
    }

    pinNodeFromId(id: string) {
        const pinner = new Pinner(this.instances);
        pinner.pinNode(id);
    }

    private unpinNode(file: TFile) {
        const pinner = new Pinner(this.instances);
        pinner.unpinNode(file.path);
        this.instances.renderer.changed();
    }

    unpinNodeFromId(id: string) {
        const pinner = new Pinner(this.instances);
        pinner.unpinNode(id);
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