import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, FeatureSetting, PluginInstances, SettingsSection } from "src/internal";
import STRINGS from "src/Strings";

export class SettingAutomation extends SettingsSection {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'automation', STRINGS.features.automation, 'workflow', "");
    }

    protected override addBody() {
        this.addAutoEnable();
        this.addStartingState();
        this.addSyncDefaultState();
        this.addOpenInNewTab();
        this.addResetAfterChanges();
    }

    private addAutoEnable(): void {
        this.elementsBody.push(new FeatureSetting(
            this.containerEl,
            STRINGS.features.autoEnable,
            STRINGS.features.autoEnableDesc,
            'auto-enabled'
        ).settingEl);
    }

    private addStartingState() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(STRINGS.states.startingState)
            .setDesc(STRINGS.states.startingStateDesc)
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
            .setName(STRINGS.states.syncDefaultState)
            .setDesc(STRINGS.states.syncDefaultStateDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.syncDefaultState);
                cb.onChange((value) => {
                    PluginInstances.settings.syncDefaultState = value;
                    PluginInstances.plugin.saveSettings();
                })
            }
            ).settingEl);
    }

    private addOpenInNewTab() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(STRINGS.features.openInNewTab)
            .setDesc(STRINGS.features.openInNewTabDesc)
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
            .setName(STRINGS.features.autoReset)
            .setDesc(STRINGS.features.autoResetDesc)
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