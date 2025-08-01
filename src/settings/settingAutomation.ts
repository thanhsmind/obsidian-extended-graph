import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, FeatureSetting, PluginInstances, SettingsSection, t } from "src/internal";

export class SettingAutomation extends SettingsSection {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'automation', t("features.ids.automation"), t("features.automation"), 'workflow', "");
    }

    protected override addBody() {
        this.addAutoEnable();
        this.addStartingState();
        this.addSyncDefaultState();
        this.addSaveConfigWithState();
        this.addOpenInNewTab();
        this.addResetAfterChanges();
    }

    private addAutoEnable(): void {
        this.elementsBody.push(new FeatureSetting(
            this.containerEl,
            t("features.autoEnable"),
            t("features.autoEnableDesc"),
            'auto-enabled'
        ).settingEl);
    }

    private addStartingState() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("states.startingState"))
            .setDesc(t("states.startingStateDesc"))
            .addDropdown(cb => {
                cb.addOptions(Object.fromEntries(Object.values(PluginInstances.settings.states).map(data => {
                    return [data.id, data.name]
                })));
                cb.setValue(PluginInstances.settings.startingStateID);
                cb.onChange(id => {
                    PluginInstances.settings.startingStateID = id;
                    PluginInstances.plugin.saveSettings();
                })
            }
            ).settingEl);
    }

    private addSyncDefaultState() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("states.syncDefaultState"))
            .setDesc(t("states.syncDefaultStateDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.syncDefaultState);
                cb.onChange((value) => {
                    PluginInstances.settings.syncDefaultState = value;
                    PluginInstances.plugin.saveSettings();
                })
            }
            ).settingEl);
    }

    private addSaveConfigWithState() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("states.saveConfigsWithState"))
            .setDesc(t("states.saveConfigsWithStateDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.saveConfigsWithState);
                cb.onChange((value) => {
                    PluginInstances.settings.saveConfigsWithState = value;
                    PluginInstances.plugin.saveSettings();
                })
            }
            ).settingEl);
    }

    private addOpenInNewTab() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.openInNewTab"))
            .setDesc(t("features.openInNewTabDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.openInNewTab);
                cb.onChange((value) => {
                    PluginInstances.settings.openInNewTab = value;
                    PluginInstances.plugin.saveSettings();
                })
            }
            ).settingEl);
    }

    private addResetAfterChanges() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.autoReset"))
            .setDesc(t("features.autoResetDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.resetAfterChanges);
                cb.onChange((value) => {
                    PluginInstances.settings.resetAfterChanges = value;
                    PluginInstances.plugin.saveSettings();
                })
            }
            ).settingEl);
    }

}