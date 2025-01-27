import { setIcon, Setting } from "obsidian";
import { GraphPlugin } from "obsidian-typings";
import { DEFAULT_STATE_ID, EngineOptions, GCSection, getEngine, GraphsManager, GraphStateModal, NodeNameSuggester, WorkspaceLeafExt } from "src/internal";

export class GCOptions extends GCSection {
    settingGlobalFilter: Setting;
    suggester: NodeNameSuggester;
    
    constructor(leaf: WorkspaceLeafExt, graphsManager: GraphsManager) {
        super(leaf, graphsManager, "options", "Options");

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
            .setName("Save for default state")
            .setTooltip("Save the current settings as the default state settings")
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
            .setName("Save for normal state")
            .setTooltip("Save the current settings as the normal state settings (no plugin enabled)")
            .addExtraButton(cb => {
                cb.extraSettingsEl.addClass("save-button");
                setIcon(cb.extraSettingsEl, "arrow-down-to-line");
                cb.onClick(() => {
                    this.saveForNormalState();
                });
            });
    }

    private createGlobalFilter(): Setting {
        new Setting(this.treeItemChildren).setName("Global filter").setHeading();

        return new Setting(this.treeItemChildren)
            .setClass("mod-search-setting")
            .addTextArea(cb => {
                cb.setPlaceholder("Global filter")
                  .setValue(this.graphsManager.plugin.settings.globalFilter);
                cb.inputEl.addClass("search-input-container");
                cb.inputEl.onblur = (async e => {
                    if (this.graphsManager.plugin.settings.globalFilter !== cb.getValue()) {
                        this.graphsManager.plugin.settings.globalFilter = cb.getValue();
                        await this.graphsManager.plugin.saveSettings();
                        this.graphsManager.plugin.graphsManager.onGlobalFilterChanged(cb.getValue());
                    }
                });
                cb.inputEl.onkeydown = (async e => {
                    if ("Enter" === e.key) {
                        e.preventDefault();
                        if (this.graphsManager.plugin.settings.globalFilter !== cb.getValue()) {
                            this.graphsManager.plugin.settings.globalFilter = cb.getValue();
                            await this.graphsManager.plugin.saveSettings();
                            this.graphsManager.plugin.graphsManager.onGlobalFilterChanged(cb.getValue());
                        }
                    }
                });
            });
    }

    private createScreenshot(): Setting {
        return new Setting(this.treeItemChildren)
            .setName("Copy SVG screenshot")
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
            .setName("Zoom on node")
            .addSearch(cb => {
                const callback = (value: string) => {
                    this.graphsManager.zoomOnNode(this.leaf, value);
                }
                this.suggester = new NodeNameSuggester(this.graphsManager.plugin.app, cb.inputEl, this.leaf.view.renderer, callback);
            });
    }

    private createButtonViewState(): Setting {
        return new Setting(this.treeItemChildren)
            .setName("Show graph state")
            .addExtraButton(cb => {
                cb.setIcon("info");
                cb.onClick(() => {
                    const graph = this.graphsManager.dispatchers.get(this.leaf.id)?.graph;
                    if (!graph) return;
                    const modal = new GraphStateModal(this.graphsManager.plugin.app, graph);
                    modal.open();
                })
            })
    }

    // =============================== CALLBACKS ===============================

    private saveForDefaultState() {
        const stateData = this.graphsManager.plugin.settings.states.find(v => v.id === DEFAULT_STATE_ID);
        if (!stateData) return;
        const engine = getEngine(this.leaf);
        stateData.engineOptions = new EngineOptions(engine.getOptions());
        this.graphsManager.statesManager.onStateNeedsSaving(stateData);
    }

    private saveForNormalState() {
        const globalFilter = this.graphsManager.plugin.settings.globalFilter;
        this.graphsManager.plugin.settings.globalFilter = "";
        const instance = (this.leaf.app.internalPlugins.getPluginById("graph") as GraphPlugin).instance;
        
        const engine = getEngine(this.leaf);
        instance.options = engine.getOptions();
        instance.saveOptions();
        this.graphsManager.plugin.settings.globalFilter = globalFilter;
    }

    private getSVGScreenshot() {
        this.graphsManager.getSVGScreenshot(this.leaf);
    }
}