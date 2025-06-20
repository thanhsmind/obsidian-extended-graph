import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, PluginInstances, SettingsSectionPerGraphType } from "src/internal";
import STRINGS from "src/Strings";
import { SettingMultiPropertiesModal } from "src/ui/modals/settingPropertiesModal";

export class SettingIcons extends SettingsSectionPerGraphType {
    colorSetting: Setting | undefined;
    parentSetting: Setting | undefined;

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'icons', '', STRINGS.features.icons, 'origami', STRINGS.features.iconsDesc);
    }

    protected override addBody(): void {
        this.addProperty();
        this.addSupportForPlugins();
    }

    private addProperty(): void {
        this.elementsBody.push(
            new Setting(this.settingTab.containerEl)
                .setName(STRINGS.features.iconProperties)
                .setDesc(STRINGS.features.iconPropertiesDesc)
                .addExtraButton(cb => {
                    cb.setIcon('mouse-pointer-click');
                    cb.onClick(() => {
                        const modal = new SettingMultiPropertiesModal(
                            STRINGS.features.iconProperties,
                            STRINGS.features.iconPropertiesAdd,
                            PluginInstances.settings.iconProperties
                        );
                        modal.open();
                    })
                }
                ).settingEl
        );
    }

    private addSupportForPlugins(): void {
        this.elementsBody.push(
            new Setting(this.settingTab.containerEl)
                .setName(STRINGS.features.iconUsePlugin)
                .setDesc(STRINGS.features.iconUsePluginDesc)
                .addToggle(cb => {
                    cb.setValue(PluginInstances.settings.usePluginForIcon);
                    cb.onChange((value) => {
                        PluginInstances.settings.usePluginForIcon = value;
                        PluginInstances.plugin.saveSettings();
                        this.colorSetting?.setVisibility(value);
                        this.parentSetting?.setVisibility(value);
                    })
                }).settingEl
        );

        this.colorSetting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.iconUsePluginColor)
            .setDesc(STRINGS.features.iconUsePluginColorDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.usePluginForIconColor);
                cb.onChange((value) => {
                    PluginInstances.settings.usePluginForIconColor = value;
                    PluginInstances.plugin.saveSettings();
                })
            });
        this.colorSetting?.setVisibility(PluginInstances.settings.usePluginForIcon);
        this.elementsBody.push(this.colorSetting.settingEl);

        this.parentSetting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.iconUseParentIcon)
            .setDesc(STRINGS.features.iconUseParentIconDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.useParentIcon);
                cb.onChange((value) => {
                    PluginInstances.settings.useParentIcon = value;
                    PluginInstances.plugin.saveSettings();
                })
            });
        this.parentSetting?.setVisibility(PluginInstances.settings.usePluginForIcon);
        this.elementsBody.push(this.parentSetting.settingEl);
    }
}