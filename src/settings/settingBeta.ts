import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, PluginInstances, SettingsSection, t } from "src/internal";

export class SettingBeta extends SettingsSection {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'beta', t("beta.beta"), 'hourglass', "");
    }

    protected override addBody() {
        this.addRevertAction();
        this.addRadialMenu();
    }

    private addRevertAction() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("beta.revertAction"))
            .setDesc(t("beta.revertActionDesc"))
            .addToggle(cb => cb
                .setValue(PluginInstances.settings.revertAction)
                .onChange(async (value) => {
                    PluginInstances.settings.revertAction = value;
                    await PluginInstances.plugin.saveSettings();
                }));

        this.elementsBody.push(setting.settingEl);
    }

    private addRadialMenu() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("beta.radialMenu"))
            .setDesc(t("beta.radialMenuDesc"))
            .addToggle(cb => cb
                .setValue(PluginInstances.settings.useRadialMenu)
                .onChange(async (value) => {
                    PluginInstances.settings.useRadialMenu = value;
                    await PluginInstances.plugin.saveSettings();
                }));

        this.elementsBody.push(setting.settingEl);
    }
}