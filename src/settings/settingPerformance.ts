import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, PluginInstances, SettingsSection, t } from "src/internal";

export class SettingPerformance extends SettingsSection {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'performances', t("features.performance"), 'cpu', "");
    }

    protected override addBody() {
        this.addDelay();
        this.addNumberOfNodes();
    }

    private addDelay() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.performanceDelay"))
            .setDesc(t("features.performanceDelayDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(PluginInstances.settings.delay.toString())
                    .onChange(async (value) => {
                        const intValue = parseInt(value);
                        if (!isNaN(intValue)) {
                            PluginInstances.settings.delay = intValue;
                            await PluginInstances.plugin.saveSettings();
                        }
                    })
            });

        this.elementsBody.push(setting.settingEl);
    }

    private addNumberOfNodes() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.performanceMaxNodes"))
            .setDesc(t("features.performanceMaxNodesDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(PluginInstances.settings.maxNodes.toString())
                    .onChange(async (value) => {
                        const intValue = parseInt(value);
                        if (!isNaN(intValue)) {
                            PluginInstances.settings.maxNodes = intValue;
                            await PluginInstances.plugin.saveSettings();
                        }
                    })
            });

        this.elementsBody.push(setting.settingEl);
    }
}