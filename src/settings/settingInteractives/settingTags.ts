import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, isTagValid, SettingInteractives, TAG_KEY } from "src/internal";
import STRINGS from "src/Strings";

export class SettingTags extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'tags', TAG_KEY, STRINGS.features.interactives.tags, 'tags', STRINGS.features.interactives.tagsDesc);
    }

    protected override addBody(): void {
        super.addBody();
        
        // Show on graph
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.interactives.arcsAdd)
            .setDesc(STRINGS.features.interactives.arcsAddTagDesc)
            .addToggle(cb => {
                cb.setValue(this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].showOnGraph);
                cb.onChange(value => {
                    this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].showOnGraph = value;
                    this.settingTab.plugin.saveSettings();
                })
            }).settingEl);
    }

    protected override isValueValid(name: string): boolean {
        return isTagValid(name);
    }

    protected override getPlaceholder(): string {
        return "tag";
    }
}