import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, PluginInstances, SettingsSectionPerGraphType, t } from "src/internal";
import { SettingMultiPropertiesModal } from "src/ui/modals/settingPropertiesModal";

export class SettingNames extends SettingsSectionPerGraphType {
    verticalOffset: Setting;

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'names', '', t("features.ids.names"), t("features.names"), 'case-sensitive', t("features.namesDesc"));
    }

    protected override addBody() {
        this.addShowWhenNeighborHighlighted();
        this.addNumberOfCharacters();
        this.addOnlyFilename();
        this.addNoExtension();
        this.addUseProperty();
        this.addBackground();
        this.addDynamicVerticalOffset();
        this.addVerticalOffset();
    }

    private addNumberOfCharacters() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.namesNumberOfCharacters"))
            .setDesc(t("features.namesNumberOfCharactersDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(PluginInstances.settings.numberOfCharacters?.toString() || '')
                    .onChange(async (value) => {
                        const intValue = parseInt(value);
                        if (!isNaN(intValue)) {
                            PluginInstances.settings.numberOfCharacters = intValue;
                        }
                        else {
                            PluginInstances.settings.numberOfCharacters = null;
                        }
                        await PluginInstances.plugin.saveSettings();
                    })
            }).settingEl);
    }

    private addOnlyFilename() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.namesShowOnlyFileName"))
            .setDesc(t("features.namesShowOnlyFileNameDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.showOnlyFileName);
                cb.onChange(value => {
                    PluginInstances.settings.showOnlyFileName = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addNoExtension() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.namesNoExtension"))
            .setDesc(t("features.namesNoExtensionDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.noExtension);
                cb.onChange(value => {
                    PluginInstances.settings.noExtension = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addUseProperty() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.namesUseProperties"))
            .setDesc(t("features.namesUsePropertiesDesc"))
            .addExtraButton(cb => {
                cb.setIcon('mouse-pointer-click');
                cb.onClick(() => {
                    const modal = new SettingMultiPropertiesModal(
                        t("features.namesUseProperties"),
                        t("features.namesUsePropertiesAdd"),
                        PluginInstances.settings.usePropertiesForName
                    );
                    modal.open();
                })
            }
            ).settingEl);
    }

    private addBackground() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.namesBackground"))
            .setDesc(t("features.namesBackgroundDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.addBackgroundToName);
                cb.onChange(value => {
                    PluginInstances.settings.addBackgroundToName = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addDynamicVerticalOffset() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.namesDynamicVerticalOffset"))
            .setDesc(t("features.namesDynamicVerticalOffsetDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.dynamicVerticalOffset);
                cb.onChange(value => {
                    this.verticalOffset.setDisabled(value);
                    PluginInstances.settings.dynamicVerticalOffset = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addVerticalOffset() {
        this.verticalOffset = new Setting(this.settingTab.containerEl)
            .setName(t("features.namesVerticalOffset"))
            .setDesc(t("features.namesVerticalOffsetDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(PluginInstances.settings.nameVerticalOffset.toString());
                cb.onChange(value => {
                    const intValue = parseInt(value);
                    PluginInstances.settings.nameVerticalOffset = isNaN(intValue) ? 0 : intValue;
                    PluginInstances.plugin.saveSettings();
                });
            });
        this.verticalOffset.setDisabled(PluginInstances.settings.dynamicVerticalOffset);

        this.elementsBody.push(this.verticalOffset.settingEl);
    }

    private addShowWhenNeighborHighlighted() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.namesShowWhenNeighborHighlighted"))
            .setDesc(t("features.namesShowWhenNeighborHighlightedDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.showNamesWhenNeighborHighlighted);
                cb.onChange(value => {
                    PluginInstances.settings.showNamesWhenNeighborHighlighted = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

}