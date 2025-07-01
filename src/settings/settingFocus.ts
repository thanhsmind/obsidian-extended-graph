import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, PluginInstances, SettingsSectionPerGraphType, t } from "src/internal";

export class SettingFocus extends SettingsSectionPerGraphType {
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'focus', '', t("features.focus"), 'telescope', t("features.focusDesc"));
    }

    protected override addHeader(): void {
        super.addHeader();
        this.toggles['localgraph']?.remove();
    }

    protected override addBody(): void {
        this.elementsBody.push(
            new Setting(this.settingTab.containerEl)
                .setName(t("features.focusScale"))
                .setDesc(t("features.focusScaleDesc"))
                .addText(cb => {
                    cb.inputEl.addClass("number");
                    cb.setValue(PluginInstances.settings.focusScaleFactor.toString())
                        .onChange(async (value) => {
                            const n = parseFloat(value);
                            if (n) {
                                PluginInstances.settings.focusScaleFactor = n;
                                await PluginInstances.plugin.saveSettings();
                            }
                        })
                }).settingEl
        );
    }
}