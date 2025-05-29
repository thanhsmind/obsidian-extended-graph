import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, isPropertyKeyValid, PluginInstances, SettingsSectionPerGraphType } from "src/internal";
import STRINGS from "src/Strings";

export class SettingNames extends SettingsSectionPerGraphType {
    verticalOffset: Setting;

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'names', '', STRINGS.features.names, 'case-sensitive', STRINGS.features.namesDesc);
    }

    protected override addBody() {
        this.addInterfaceFont();
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
            .setName(STRINGS.features.namesNumberOfCharacters)
            .setDesc(STRINGS.features.namesNumberOfCharactersDesc)
            .addText(cb => cb
                .setValue(PluginInstances.settings.numberOfCharacters?.toString() || '')
                .onChange(async (value) => {
                    const intValue = parseInt(value);
                    if (!isNaN(intValue)) {
                        PluginInstances.settings.numberOfCharacters = intValue;
                    }
                    else {
                        PluginInstances.settings.numberOfCharacters = null;
                    }
                    await PluginInstances.plugin.saveSettings();
                })).settingEl);
    }

    private addOnlyFilename() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.namesShowOnlyFileName)
            .setDesc(STRINGS.features.namesShowOnlyFileNameDesc)
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
            .setName(STRINGS.features.namesNoExtension)
            .setDesc(STRINGS.features.namesNoExtensionDesc)
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
            .setName(STRINGS.features.namesUseProperty)
            .setDesc(STRINGS.features.namesUsePropertyDesc)
            .addText(cb => {
                cb.setValue(PluginInstances.settings.usePropertyForName || '');
                cb.onChange(value => {
                    if (value === '') {
                        PluginInstances.settings.usePropertyForName = null;
                    } else if (isPropertyKeyValid(value)) {
                        PluginInstances.settings.usePropertyForName = value;
                    }
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addBackground() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.namesBackground)
            .setDesc(STRINGS.features.namesBackgroundDesc)
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
            .setName(STRINGS.features.namesDynamicVerticalOffset)
            .setDesc(STRINGS.features.namesDynamicVerticalOffsetDesc)
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
            .setName(STRINGS.features.namesVerticalOffset)
            .setDesc(STRINGS.features.namesVerticalOffsetDesc)
            .addText(cb => {
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

    private addInterfaceFont() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.namesInterfaceFont)
            .setDesc(STRINGS.features.namesInterfaceFontDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.useInterfaceFont);
                cb.onChange(value => {
                    PluginInstances.settings.useInterfaceFont = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

}