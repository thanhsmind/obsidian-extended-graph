import { Setting } from "obsidian";
import { CSSSnippetsSuggester, ExtendedGraphSettingTab, PluginInstances, SettingsSection } from "src/internal";
import STRINGS from "src/Strings";

export class SettingBeta extends SettingsSection {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'beta', STRINGS.beta.beta, 'hourglass', "");
    }

    protected override addBody() {
        this.addRevertAction();
        this.addEnableCSS();
        this.addRadialMenu();
    }

    private addRevertAction() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.beta.revertAction)
            .setDesc(STRINGS.beta.revertActionDesc)
            .addToggle(cb => cb
                .setValue(PluginInstances.settings.revertAction)
                .onChange(async (value) => {
                    PluginInstances.settings.revertAction = value;
                    await PluginInstances.plugin.saveSettings();
                }));

        this.elementsBody.push(setting.settingEl);
    }

    private addEnableCSS() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.beta.enableCSS)
            .setDesc(STRINGS.beta.enableCSSDesc)
            .addToggle(cb => cb
                .setValue(PluginInstances.settings.enableCSS)
                .onChange(value => {
                    PluginInstances.settings.enableCSS = value;
                    PluginInstances.plugin.saveSettings();
                }))
            .addSearch(cb => {
                new CSSSnippetsSuggester(cb.inputEl, (value: string) => {
                    PluginInstances.settings.cssSnippetFilename = value;
                    PluginInstances.plugin.saveSettings();
                });
            });

        this.elementsBody.push(setting.settingEl);
    }

    private addRadialMenu() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.beta.radialMenu)
            .setDesc(STRINGS.beta.radialMenuDesc)
            .addToggle(cb => cb
                .setValue(PluginInstances.settings.useRadialMenu)
                .onChange(async (value) => {
                    PluginInstances.settings.useRadialMenu = value;
                    await PluginInstances.plugin.saveSettings();
                }));

        this.elementsBody.push(setting.settingEl);
    }
}