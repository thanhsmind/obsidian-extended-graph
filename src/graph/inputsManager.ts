import { Keymap, KeymapEventHandler, Menu, TFile, UserEvent } from "obsidian";
import { FederatedPointerEvent, Graphics } from "pixi.js";
import { Pinner, RadialMenuManager, t } from "src/internal";
import { GraphInstances, PluginInstances } from "src/pluginInstances";

export class InputsManager {
    instances: GraphInstances;
    coreOnNodeClick?: (e: UserEvent | null, id: string, type: string) => void;
    coreOnNodeRightClick?: (e: UserEvent | null, id: string, type: string) => void;

    isSelecting: boolean = false;
    selectionStartPosition: { x: number, y: number };
    selectionRectangle: Graphics;

    constructor(instances: GraphInstances) {
        this.instances = instances;

        this.selectionRectangle = new Graphics();

        this.bindStageEvents();
        this.changeNodeOnClick();
        this.preventDraggingPinnedNodes();
    }

    private bindStageEvents(): void {
        this.onPointerDownOnStage = this.onPointerDownOnStage.bind(this);
        this.instances.renderer.px.stage.on('pointerdown', this.onPointerDownOnStage);

        this.onPointerUpOnStage = this.onPointerUpOnStage.bind(this);
        this.instances.renderer.px.stage.on('pointerup', this.onPointerUpOnStage);

        this.onPointerUpOnWindow = this.onPointerUpOnWindow.bind(this);
        this.onPointerMoveOnStage = this.onPointerMoveOnStage.bind(this);
        this.onInputToUnselectNodes = this.onInputToUnselectNodes.bind(this);
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

    // ========================= POINTERS UP/DOWN/MOVE =========================

    private onPointerDownOnStage(e: FederatedPointerEvent): void {
        this.preventDraggingPinnedNodes();

        // Selection if "shift" is holded
        if (e.button === 0 && Keymap.isModifier(e, "Shift") && !this.instances.renderer.dragNode) {
            // Get start position, and add rectangle if needed
            this.selectionStartPosition = e.getLocalPosition(this.instances.renderer.hanger);
            if (!this.selectionRectangle.parent) {
                this.instances.renderer.hanger.addChild(this.selectionRectangle);
            }
            this.selectionRectangle.clear();
            this.selectionRectangle.visible = true;

            // Start special behaviors
            this.preventPan();
            this.instances.renderer.px.stage.on('globalpointermove', this.onPointerMoveOnStage);
            this.instances.renderer.interactiveEl.win.addEventListener("mouseup", this.onPointerUpOnWindow);
            this.isSelecting = true;
        }
    }

    private onPointerUpOnStage(): void {
        this.pinDraggingPinnedNode();
    }

    private onPointerUpOnWindow(e: FederatedPointerEvent) {
        if (e.button === 0) {
            // Clear rectangle
            this.selectionRectangle.visible = false;

            // Stop special behaviors
            this.allowPan();
            this.instances.renderer.px.stage.off('globalpointermove', this.onPointerMoveOnStage);
            this.instances.renderer.interactiveEl.win.removeEventListener("mouseup", this.onPointerUpOnWindow);
            this.isSelecting = false;

            // Select nodes
            this.instances.nodesSet.selectNodes(this.selectionRectangle.getLocalBounds());

            // Listen to unselect
            this.instances.renderer.interactiveEl.win.addEventListener("mouseup", this.onInputToUnselectNodes);
            this.instances.renderer.interactiveEl.win.addEventListener("keydown", this.onInputToUnselectNodes);
        }
    }

    private preventPan() {
        const renderer = this.instances.renderer;
        PluginInstances.proxysManager.registerProxy<typeof this.instances.renderer.setPan>(
            this.instances.renderer,
            "setPan",
            {
                apply(target, thisArg, args) {
                    renderer.panvX = 0;
                    renderer.panvY = 0;
                    renderer.panning = false;
                    return false;
                }
            }
        );
    }

    private allowPan() {
        PluginInstances.proxysManager.unregisterProxy(this.instances.renderer.setPan);
    }

    private onPointerMoveOnStage(e: FederatedPointerEvent): void {
        if (!this.isSelecting) return;

        const pos = e.getLocalPosition(this.instances.renderer.hanger);
        this.selectionRectangle.clear();
        this.selectionRectangle.beginFill(0x9872f5, 0.1);
        this.selectionRectangle.lineStyle(2, 0x9872f5, 0.3);
        this.selectionRectangle.drawRect(
            Math.min(this.selectionStartPosition.x, pos.x),
            Math.min(this.selectionStartPosition.y, pos.y),
            Math.abs(pos.x - this.selectionStartPosition.x),
            Math.abs(pos.y - this.selectionStartPosition.y),
        );
        this.selectionRectangle.endFill();
    }

    private onInputToUnselectNodes(e: MouseEvent | KeyboardEvent) {
        if (e instanceof MouseEvent || (e instanceof KeyboardEvent && e.key === "Escape")) {
            this.instances.nodesSet.unselectNodes();

            // Stop listening
            this.instances.renderer.interactiveEl.win.removeEventListener("mouseup", this.onInputToUnselectNodes);
            this.instances.renderer.interactiveEl.win.removeEventListener("keydown", this.onInputToUnselectNodes);
        }
    }

    // ============================== NODE CLICKS ==============================

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
        this.instances.renderer.px.stage.off('pointerdown', this.onPointerDownOnStage);
        this.instances.renderer.px.stage.off('pointerup', this.onPointerUpOnStage);

        this.instances.renderer.interactiveEl.win.removeEventListener("mouseup", this.onPointerUpOnWindow);
        this.instances.renderer.px.stage.off('globalpointermove', this.onPointerMoveOnStage);

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

    private preventDraggingPinnedNodes() {
        const node = this.instances.renderer.dragNode;
        if (node && this.instances.nodesSet.isNodePinned(node.id)) {
            const pinner = new Pinner(this.instances);
            pinner.setLastDraggedPinnedNode(node.id);
        }
    }

    private pinDraggingPinnedNode() {
        const pinner = new Pinner(this.instances);
        pinner.pinLastDraggedPinnedNode();
    }
}