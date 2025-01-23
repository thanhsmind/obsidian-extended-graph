import { Setting } from "obsidian";
import { ExtendedGraphSettingTab } from "./settingTab";
import { SettingsSection } from "./settingsSection";

export class SettingPerformance extends SettingsSection {
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, "Performances", 'cpu', "");
    }

    protected override addBody() {
        this.addDelay();
        this.addNumberOfNodes();
    }

    private addNumberOfNodes() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName('Maximum number of nodes')
            .setDesc('If the graph contains more nodes than this setting, the plugin will be disabled.')
            .addText(cb => cb
                .setValue(this.settingTab.plugin.settings.maxNodes.toString())
                .onChange(async (value) => {
                    const intValue = parseInt(value);
                    if (!isNaN(intValue)) {
                        this.settingTab.plugin.settings.maxNodes = intValue;
                        await this.settingTab.plugin.saveSettings();
                    }
            }));

        this.elementsBody.push(setting.settingEl);
    }

    private addDelay() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName('Initialization delay (milliseconds)')
            .setDesc('Because of asynchronous mechanics, it can be needed to wait a time before starting initializing the extended features')
            .addText(cb => cb
                .setValue(this.settingTab.plugin.settings.delay.toString())
                .onChange(async (value) => {
                    const intValue = parseInt(value);
                    if (!isNaN(intValue)) {
                        this.settingTab.plugin.settings.delay = intValue;
                        await this.settingTab.plugin.saveSettings();
                    }
            }));

        this.elementsBody.push(setting.settingEl);
    }
}