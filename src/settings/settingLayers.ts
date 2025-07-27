import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, PluginInstances, SettingsSectionPerGraphType, t } from "src/internal";
import { SettingMultiPropertiesModal } from "src/ui/modals/settingPropertiesModal";

export class SettingLayers extends SettingsSectionPerGraphType {
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'layers', '', t("features.layers"), 'layers', t("features.layersDesc"));
    }

    protected override addBody() {
        this.addProperties();
    }

    private addProperties() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.layerProperties"))
            .setDesc(t("features.layerPropertiesDesc"))
            .addExtraButton(cb => {
                cb.setIcon('mouse-pointer-click');
                cb.onClick(() => {
                    const modal = new SettingMultiPropertiesModal(
                        t("features.layerProperties"),
                        t("features.layerPropertiesAdd"),
                        PluginInstances.settings.layerProperties
                    );
                    modal.open();
                })
            }
            ).settingEl);
    }
}