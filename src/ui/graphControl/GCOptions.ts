import { setIcon, Setting } from "obsidian";
import { GraphPlugin } from "obsidian-typings";
import { DEFAULT_STATE_ID, EngineOptions, GCSection, getEngine, GraphStateModal, NodeNameSuggester, PluginInstances, WorkspaceLeafExt } from "src/internal";
import STRINGS from "src/Strings";

export class GCOptions extends GCSection {
    settingGlobalFilter: Setting;
    suggester: NodeNameSuggester;
    
    constructor(leaf: WorkspaceLeafExt) {
        super(leaf, "options", STRINGS.plugin.options);

        this.treeItemChildren = this.root.createDiv("tree-item-children");
        this.display(true);

        this.collapseGraphControlSection();
    }

    // ================================ DISPLAY ================================

    override display(enable: boolean) {
        this.treeItemChildren.innerHTML = "";

        this.createSaveForDefaultState();
        if (enable) this.createSaveForNormalState();
        if (enable) this.settingGlobalFilter = this.createGlobalFilter();
        this.createZoomOnNode();
        this.createScreenshot();
        if (enable) this.createButtonViewState();
    }

    private createSaveForDefaultState(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(STRINGS.states.saveForDefaultState)
            .setTooltip(STRINGS.states.saveForDefaultStateDesc)
            .addExtraButton(cb => {
                cb.extraSettingsEl.addClass("save-button");
                setIcon(cb.extraSettingsEl, "arrow-up-to-line");
                cb.onClick(() => {
                    this.saveForDefaultState();
                });
            });
    }

    private createSaveForNormalState(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(STRINGS.states.saveForNormalState)
            .setTooltip(STRINGS.states.saveForNormalStateDesc)
            .addExtraButton(cb => {
                cb.extraSettingsEl.addClass("save-button");
                setIcon(cb.extraSettingsEl, "arrow-down-to-line");
                cb.onClick(() => {
                    this.saveForNormalState();
                });
            });
    }

    private createGlobalFilter(): Setting {
        new Setting(this.treeItemChildren).setName(STRINGS.features.globalFilter).setHeading();

        return new Setting(this.treeItemChildren)
            .setClass("mod-search-setting")
            .addTextArea(cb => {
                cb.setPlaceholder(STRINGS.features.globalFilter)
                  .setValue(PluginInstances.settings.globalFilter);
                cb.inputEl.addClass("search-input-container");
                cb.inputEl.onblur = (async e => {
                    if (PluginInstances.settings.globalFilter !== cb.getValue()) {
                        PluginInstances.settings.globalFilter = cb.getValue();
                        await PluginInstances.plugin.saveSettings();
                        PluginInstances.graphsManager.onGlobalFilterChanged(cb.getValue());
                    }
                });
                cb.inputEl.onkeydown = (async e => {
                    if ("Enter" === e.key) {
                        e.preventDefault();
                        if (PluginInstances.settings.globalFilter !== cb.getValue()) {
                            PluginInstances.settings.globalFilter = cb.getValue();
                            await PluginInstances.plugin.saveSettings();
                            PluginInstances.graphsManager.onGlobalFilterChanged(cb.getValue());
                        }
                    }
                });
            });
    }

    private createScreenshot(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(STRINGS.features.svgScreenshotCopy)
            .addExtraButton(cb => {
                cb.extraSettingsEl.addClass("screenshot-button");
                setIcon(cb.extraSettingsEl, "image");
                cb.onClick(() => {
                    this.getSVGScreenshot();
                });
            });
    }

    private createZoomOnNode(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(STRINGS.features.zoomOnNode)
            .addSearch(cb => {
                const callback = (value: string) => {
                    PluginInstances.graphsManager.zoomOnNode(this.leaf, value);
                }
                this.suggester = new NodeNameSuggester(PluginInstances.app, cb.inputEl, this.leaf.view.renderer, callback);
            });
    }

    private createButtonViewState(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(STRINGS.states.showGraphState)
            .addExtraButton(cb => {
                cb.setIcon("info");
                cb.onClick(() => {
                    const graph = PluginInstances.graphsManager.dispatchers.get(this.leaf.id)?.graph;
                    if (!graph) return;
                    const modal = new GraphStateModal(PluginInstances.app, graph);
                    modal.open();
                })
            })
    }

    // =============================== CALLBACKS ===============================

    private saveForDefaultState() {
        const stateData = PluginInstances.settings.states.find(v => v.id === DEFAULT_STATE_ID);
        if (!stateData) return;
        const engine = getEngine(this.leaf);
        stateData.engineOptions = new EngineOptions(engine.getOptions());
        PluginInstances.statesManager.onStateNeedsSaving(stateData);
    }

    private saveForNormalState() {
        const globalFilter = PluginInstances.settings.globalFilter;
        PluginInstances.settings.globalFilter = "";
        const instance = (this.leaf.app.internalPlugins.getPluginById("graph") as GraphPlugin).instance;
        
        const engine = getEngine(this.leaf);
        instance.options = engine.getOptions();
        instance.saveOptions();
        PluginInstances.settings.globalFilter = globalFilter;
    }

    private getSVGScreenshot() {
        PluginInstances.graphsManager.getSVGScreenshot(this.leaf);
    }
}