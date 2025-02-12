import { Component, ExtraButtonComponent, WorkspaceLeaf } from "obsidian";
import { setPluginIcon } from "src/internal";
import STRINGS from "src/Strings";

export class MenuUI extends Component {
    viewContent: HTMLElement;
    leaf: WorkspaceLeaf;

    buttonEnable: ExtraButtonComponent;
    buttonReset: ExtraButtonComponent;
    enabled: boolean;

    constructor(leaf: WorkspaceLeaf) {
        super();
        this.leaf = leaf;
        this.viewContent = this.leaf.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
        const graphControls = this.viewContent.querySelector(".graph-controls") as HTMLDivElement;

        const hr = graphControls.createEl("hr");
        hr.addClass("separator-exended-graph");
        this.createEnableButton(graphControls);
        this.createResetButton(graphControls);
    }

    createEnableButton(graphControls: HTMLDivElement) {
        this.buttonEnable = new ExtraButtonComponent(graphControls)
            .setTooltip(`${STRINGS.controls.enable} ${STRINGS.plugin.name}`, {placement: 'top'})
            //.setIcon("sparkles")
            .onClick(() => {
                if (!this.enabled) {
                    this.leaf.trigger("extended-graph:enable-plugin", this.leaf);
                } else {
                    this.leaf.trigger("extended-graph:disable-plugin", this.leaf);
                }
            })
            .then(cb => {
                setPluginIcon(cb.extraSettingsEl);
                cb.extraSettingsEl.addClasses(["graph-controls-button", "mod-extended-graph-toggle"]);
            });
    }

    createResetButton(graphControls: HTMLDivElement) {
        this.buttonReset = new ExtraButtonComponent(graphControls)
            .setTooltip(STRINGS.controls.resetGraph)
            .setIcon("rotate-ccw")
            .onClick(() => {
                if (this.enabled) {
                    this.leaf.trigger("extended-graph:reset-plugin", this.leaf);
                }
            })
            .then(cb => {
                cb.extraSettingsEl.addClasses(["graph-controls-button", "mod-extended-graph-reset"]);
                cb.extraSettingsEl.style.display = "none";
            });
    }

    setEnableUIState() {
        this.enabled = true;
        this.buttonEnable.extraSettingsEl.addClass("is-active");
        this.buttonEnable.setTooltip(`${STRINGS.controls.disable} ${STRINGS.plugin.name}`, {placement: 'top'});
        this.buttonReset.extraSettingsEl.style.display = "";
    }

    setDisableUIState() {
        this.enabled = false;
        this.buttonEnable.extraSettingsEl.removeClass("is-active");
        this.buttonEnable.setTooltip(`${STRINGS.controls.enable} ${STRINGS.plugin.name}`, {placement: 'top'});
        this.buttonReset.extraSettingsEl.style.display = "none";
    }
}