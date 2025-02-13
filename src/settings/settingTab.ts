import { App, PluginSettingTab, Setting } from "obsidian";
import { SettingFocus, SettingFolders, SettingImages, SettingLinks, SettingElementsStats, SettingPerformance, SettingPropertiesArray, SettingShapes, SettingsSection, SettingTags, SettingZoom, PluginInstances } from "src/internal";
import ExtendedGraphPlugin from "src/main";
import STRINGS from "src/Strings";

export class ExtendedGraphSettingTab extends PluginSettingTab {
    sections: SettingsSection[] = [];

    constructor(app: App, plugin: ExtendedGraphPlugin) {
        super(app, plugin);

        this.sections.push(new SettingTags(this));
        this.sections.push(new SettingPropertiesArray(this));
        this.sections.push(new SettingLinks(this));
        this.sections.push(new SettingFolders(this));
        this.sections.push(new SettingImages(this));
        this.sections.push(new SettingFocus(this));
        this.sections.push(new SettingShapes(this));
        this.sections.push(new SettingElementsStats(this));
        this.sections.push(new SettingZoom(this));
        this.sections.push(new SettingPerformance(this));
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        containerEl.addClass("extended-graph-settings");

        new Setting(containerEl)
            .setName(STRINGS.features.disableNodes)
            .setDesc(STRINGS.features.disableNodesDesc)
            .addToggle(cb => {
                cb.setValue(!PluginInstances.settings.fadeOnDisable);
                cb.onChange(value => {
                    PluginInstances.settings.fadeOnDisable = !value;
                    PluginInstances.plugin.saveSettings();
                })
            });

        // FEATURES
        for (const section of this.sections) {
            section.display();
        }
    }
}