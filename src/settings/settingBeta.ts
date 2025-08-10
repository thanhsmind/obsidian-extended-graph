import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, ExternalLinkOption, PluginInstances, SettingsSection, t } from "src/internal";

export class SettingBeta extends SettingsSection {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'beta', t("features.ids.beta"), t("beta.betaFeatures"), 'hourglass', "");
    }

    protected override addBody() {
        this.addRevertAction();
        this.addExternalLinks();
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

    private addExternalLinks() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.externalLinks"))
            .setDesc(t("features.externalLinksDesc"))
            .addDropdown(cb => {
                const options: Record<ExternalLinkOption, string> = {
                    none: "None",
                    domain: "Domain",
                    href: "Href",
                    domain_and_href: "Domain and href"
                };
                cb.addOptions(options);
                cb.setValue(PluginInstances.settings.externalLinks);
                cb.onChange(async (value) => {
                    PluginInstances.settings.externalLinks = value as ExternalLinkOption;
                    await PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }
}