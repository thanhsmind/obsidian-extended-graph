import { TAG_KEY } from "src/globalVariables";
import { ExtendedGraphSettingTab } from "../settingTab";
import { SettingInteractives } from "./settingInteractive";
import { Setting } from "obsidian";

export class SettingTags extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'tags', TAG_KEY, "Tags", 'tags', "Display and filter by tags");
    }

    protected override addBody(): void {
        super.addBody();
        
        // Show on graph
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(`Add arcs`)
            .setDesc(`Add arcs around the nodes to visualize the tags.`)
            .addToggle(cb => {
                cb.setValue(this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].showOnGraph);
                cb.onChange(value => {
                    this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].showOnGraph = value;
                    this.settingTab.plugin.saveSettings();
                })
            }).settingEl);
    }

    protected override isValueValid(name: string): boolean {
        return /^[a-zA-Z/]+$/.test(name);
    }

    protected override getPlaceholder(): string {
        return "tag";
    }
}