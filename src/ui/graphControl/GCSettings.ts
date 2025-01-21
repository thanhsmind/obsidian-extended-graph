import { Component, setIcon, Setting } from "obsidian";
import { EngineOptions } from "src/views/viewData";
import { DEFAULT_VIEW_ID } from "src/globalVariables";
import { GraphEventsDispatcher } from "src/graph/graphEventsDispatcher";
import { GraphsManager } from "src/graphsManager";
import { getEngine } from "src/helperFunctions";
import { WorkspaceLeafExt } from "src/types/leaf";
import { GraphPlugin } from "obsidian-typings";
import { GCSection } from "./GCSection";

export class GCSettings extends GCSection {
    settingGlobalFilter: Setting;
    
    constructor(leaf: WorkspaceLeafExt, graphsManager: GraphsManager) {
        super(leaf, graphsManager, "settings");

        this.treeItemChildren = this.root.createDiv("tree-item-children");
        this.createSaveForDefaultView();
        this.onlyWhenPluginEnabled.push(this.createSaveForNormalView().settingEl);
        this.settingGlobalFilter = this.createGlobalFilter();
        this.onlyWhenPluginEnabled.push(this.settingGlobalFilter.settingEl);

        this.collapseGraphControlSection();
    }

    createSaveForDefaultView(): Setting {
        return new Setting(this.treeItemChildren)
            .setName("Save for default view")
            .setTooltip("Save the current settings as the default view settings")
            .addExtraButton(cb => {
                cb.extraSettingsEl.addClass("save-button");
                setIcon(cb.extraSettingsEl, "arrow-up-to-line");
                cb.onClick(() => {
                    this.saveForDefaultView();
                });
            });
    }

    createSaveForNormalView(): Setting {
        return new Setting(this.treeItemChildren)
            .setName("Save for normal view")
            .setTooltip("Save the current settings as the normal view settings (no plugin enabled)")
            .addExtraButton(cb => {
                cb.extraSettingsEl.addClass("save-button");
                setIcon(cb.extraSettingsEl, "arrow-down-to-line");
                cb.onClick(() => {
                    this.saveForNormalView();
                });
            });
    }

    createGlobalFilter(): Setting {
        const filterHeader = new Setting(this.treeItemChildren).setName("Global filter").setHeading();
        this.onlyWhenPluginEnabled.push(filterHeader.settingEl);

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

    saveForDefaultView() {
        const viewData = this.graphsManager.plugin.settings.views.find(v => v.id === DEFAULT_VIEW_ID);
        if (!viewData) return;
        const engine = getEngine(this.leaf);
        viewData.engineOptions = new EngineOptions(engine.getOptions());
        this.graphsManager.onViewNeedsSaving(viewData);
    }

    saveForNormalView() {
        const globalFilter = this.graphsManager.plugin.settings.globalFilter;
        this.graphsManager.plugin.settings.globalFilter = "";
        const instance = (this.leaf.app.internalPlugins.getPluginById("graph") as GraphPlugin).instance;
        
        const engine = getEngine(this.leaf);
        instance.options = engine.getOptions();
        instance.saveOptions();
        this.graphsManager.plugin.settings.globalFilter = globalFilter;
    }
}