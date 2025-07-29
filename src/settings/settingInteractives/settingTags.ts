import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, PluginInstances, SettingInteractives, t, TAG_KEY } from "src/internal";

export class SettingTags extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'tags', TAG_KEY, t("features.ids.tags"), t("features.interactives.tags"), 'tags', t("features.interactives.tagsDesc"), true);
    }

    protected override addBody(): void {
        super.addBody();

        // Show on graph
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.interactives.arcsAdd"))
            .setDesc(t("features.interactives.arcsAddTagDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.interactiveSettings[this.interactiveKey].showOnGraph);
                cb.onChange(value => {
                    PluginInstances.settings.interactiveSettings[this.interactiveKey].showOnGraph = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    protected override isValueValid(name: string): boolean {
        return /^[^\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,.:;<=>?@^`{|}~\[\]\\\s]+/.test(name);
    }

    protected override getPlaceholder(): string {
        return "tag";
    }

    protected override getAllTypes(): string[] {
        return SettingTags.getAllTypes();
    }

    static getAllTypes(): string[] {
        return Object.keys(PluginInstances.app.metadataCache.getTags());
    }
}