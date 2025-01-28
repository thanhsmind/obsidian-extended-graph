import { App, PluginSettingTab, Setting } from "obsidian";
import { SettingFocus, SettingFolders, SettingImages, SettingLinks, SettingNodeColor, SettingNodeSize, SettingPerformance, SettingPropertiesArray, SettingShapes, SettingsSection, SettingTags, SettingZoom } from "src/internal";
import ExtendedGraphPlugin from "src/main";
import STRINGS from "src/Strings";

export class ExtendedGraphSettingTab extends PluginSettingTab {
    plugin: ExtendedGraphPlugin;
    sections: SettingsSection[] = [];

    constructor(app: App, plugin: ExtendedGraphPlugin) {
        super(app, plugin);
        this.plugin = plugin;

        this.sections.push(new SettingTags(this));
        this.sections.push(new SettingPropertiesArray(this));
        this.sections.push(new SettingLinks(this));
        this.sections.push(new SettingFolders(this));
        this.sections.push(new SettingImages(this));
        this.sections.push(new SettingFocus(this));
        this.sections.push(new SettingShapes(this));
        this.sections.push(new SettingNodeSize(this));
        this.sections.push(new SettingNodeColor(this));
        this.sections.push(new SettingZoom(this));
        this.sections.push(new SettingPerformance(this));
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        containerEl.addClass("extended-graph-settings");

        new Setting(containerEl)
            .setName(STRINGS.features.globalFilter)
            .setDesc(STRINGS.features.globalFilterDesc)
            .addTextArea(cb => cb
                .setValue(this.plugin.settings.globalFilter)
                .onChange(async (value) => {
                    this.plugin.settings.globalFilter = value;
                    await this.plugin.saveSettings();
                    this.plugin.graphsManager.onGlobalFilterChanged(value);
            }));

        new Setting(containerEl)
            .setName(STRINGS.features.disableNodes)
            .setDesc(STRINGS.features.disableNodesDesc)
            .addToggle(cb => {
                cb.setValue(!this.plugin.settings.fadeOnDisable);
                cb.onChange(value => {
                    this.plugin.settings.fadeOnDisable = !value;
                    this.plugin.saveSettings();
                })
            });

        // FEATURES
        for (const section of this.sections) {
            section.display();
        }
    }
}