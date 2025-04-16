import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, PluginInstances, SettingsSectionCollapsible } from "src/internal";
import STRINGS from "src/Strings";

export class SettingArrows extends SettingsSectionCollapsible {
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'arrows', '', STRINGS.features.arrows, 'mouse-pointer-2', STRINGS.features.arrowsDesc);
    }

    protected override addBody() {
        this.addInvertArrows();
        this.addFlatArrows();
    }

    private addInvertArrows() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.arrowsInvert)
            .setDesc(STRINGS.features.arrowsInvertDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.invertArrows);
                cb.onChange(value => {
                    PluginInstances.settings.invertArrows = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addFlatArrows() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.arrowsFlat)
            .setDesc(STRINGS.features.arrowsFlatDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.flatArrows);
                cb.onChange(value => {
                    PluginInstances.settings.flatArrows = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

}