import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, ExternalLinkOption, ExtendedGraphInstances, SettingMultiPropertiesModal, SettingsSection, t } from "src/internal";

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
                .setValue(ExtendedGraphInstances.settings.revertAction)
                .onChange(async (value) => {
                    ExtendedGraphInstances.settings.revertAction = value;
                    await ExtendedGraphInstances.plugin.saveSettings();
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
                cb.setValue(ExtendedGraphInstances.settings.externalLinks);
                cb.onChange(async (value) => {
                    ExtendedGraphInstances.settings.externalLinks = value as ExternalLinkOption;
                    await ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);

        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.externalLinksProperties"))
            .setDesc(t("features.externalLinksPropertiesDesc"))
            .addExtraButton(cb => {
                cb.setIcon('mouse-pointer-click');
                cb.onClick(() => {
                    const modal = new SettingMultiPropertiesModal(
                        t("features.externalLinksProperties"),
                        t("features.externalLinksPropertiesAdd"),
                        ExtendedGraphInstances.settings.externalLinksProperties
                    );
                    modal.open();
                })
            }
            ).settingEl);
    }
}