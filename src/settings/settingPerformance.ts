import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, PluginInstances, SettingsSection } from "src/internal";
import STRINGS from "src/Strings";

export class SettingPerformance extends SettingsSection {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'performances', STRINGS.features.performance, 'cpu', "");
    }

    protected override addBody() {
        this.addDelay();
        this.addNumberOfNodes();
        this.addRevertAction();
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

    private addRevertAction() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName("Revert action")
            .setDesc("If the max number of nodes is reached, try to reverse last action instead of disabling the plugin.")
            .addToggle(cb => cb
                .setValue(PluginInstances.settings.revertAction)
                .onChange(async (value) => {
                    PluginInstances.settings.revertAction = value;
                    await PluginInstances.plugin.saveSettings();
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