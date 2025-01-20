import { Component, setIcon, setTooltip } from "obsidian";
import { GraphsManager } from "src/graphsManager";
import { WorkspaceLeafExt } from "src/types/leaf";
import { ShapePickerModal } from "../modals/shapePickerModal";
import { ShapeEnum } from "src/graph/graphicElements/nodes/shapes";

export class GCColorGroups extends Component {
    graphsManager: GraphsManager;
    graphControls: HTMLElement | null;
    modColorGroups: HTMLElement | null;

    observerColorGroups: MutationObserver;

    constructor(leaf: WorkspaceLeafExt, graphsManager: GraphsManager) {
        super();
        this.graphsManager = graphsManager;
        this.graphControls = leaf.containerEl.querySelector(".graph-controls") as HTMLElement;
        this.modColorGroups = this.graphControls.querySelector(".mod-color-groups");

        this.observeColorGroups();
    }

    private observeColorGroups(): void {
        if (!this.graphControls) return;

        this.observerColorGroups = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if ((node as HTMLElement).classList.contains("graph-color-group")) {
                        this.onGroupAdded(node);
                    }
                });
            })
        });
        this.observerColorGroups.observe(this.graphControls, {childList: true, subtree: true});
    }

    onunload(): void {
        this.observerColorGroups.disconnect();
    }

    // =========================================================================

    private onGroupAdded(groupNode: Node) {
        this.addShapeIcon(groupNode);
    }

    private addShapeIcon(groupNode: Node) {
        let colorInput: Node | undefined;
        let textInput: Node | undefined;
        groupNode.childNodes.forEach(childNode => {
            const el = childNode as HTMLElement;
            if (el.tagName === 'INPUT' && el.getAttribute('type') === 'color') {
                colorInput = childNode;
            }
            else if (el.tagName === 'INPUT' && el.getAttribute('type') === 'text') {
                textInput = childNode;
            }
        });

        if (!colorInput) return;

        const shapeInput = groupNode.createDiv("clickable-icon");
        setIcon(shapeInput, "shapes");
        setTooltip(shapeInput, "Pick shape");
        shapeInput.onclick = (ev => {
            if (!textInput) return;
            this.openShapePicker(textInput);
        })

        groupNode.insertAfter(shapeInput, colorInput);
    }

    // =========================================================================

    private openShapePicker(queryNode: Node) {
        const shapePicker = new ShapePickerModal(this.graphsManager.plugin.app, (shape => {
            shapePicker.close();
            this.setShape(queryNode, shape);
        }));
        shapePicker.open();
    }

    private setShape(queryNode: Node, shape: ShapeEnum) {
        const query = (queryNode as HTMLInputElement).value;
        console.log(query, shape);
    }
}