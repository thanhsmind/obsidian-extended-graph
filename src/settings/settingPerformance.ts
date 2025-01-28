import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, PluginInstances, SettingsSection } from "src/internal";
import STRINGS from "src/Strings";

export class SettingPerformance extends SettingsSection {
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, STRINGS.features.performance, 'cpu', "");
    }

    protected override addBody() {
        this.addDelay();
        this.addNumberOfNodes();
    }

    private addNumberOfNodes() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.performanceMaxNodes)
            .setDesc(STRINGS.features.performanceMaxNodesDesc)
            .addText(cb => cb
                .setValue(PluginInstances.settings.maxNodes.toString())
                .onChange(async (value) => {
                    const intValue = parseInt(value);
                    if (!isNaN(intValue)) {
                        PluginInstances.settings.maxNodes = intValue;
                        await PluginInstances.plugin.saveSettings();
                    }
            }));

        this.elementsBody.push(setting.settingEl);
    }

    private addDelay() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.performanceDelay)
            .setDesc(STRINGS.features.performanceDelayDesc)
            .addText(cb => cb
                .setValue(PluginInstances.settings.delay.toString())
                .onChange(async (value) => {
                    const intValue = parseInt(value);
                    if (!isNaN(intValue)) {
                        PluginInstances.settings.delay = intValue;
                        await PluginInstances.plugin.saveSettings();
                    }
            }));

        this.elementsBody.push(setting.settingEl);
    }
}