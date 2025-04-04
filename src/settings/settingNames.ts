import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, isPropertyKeyValid, PluginInstances, SettingsSectionCollapsible } from "src/internal";
import STRINGS from "src/Strings";

export class SettingNames extends SettingsSectionCollapsible {
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'names', '', STRINGS.features.names, 'case-sensitive', STRINGS.features.namesDesc);
    }

    protected override addBody() {
        this.addNumberOfCharacters();
        this.addOnlyFilename();
        this.addNoExtension();
        this.addUseProperty();
        this.addBackground();
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

    private addVerticalOffset() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.namesVerticalOffset)
            .setDesc(STRINGS.features.namesVerticalOffsetDesc)
            .addText(cb => {
                cb.setValue(PluginInstances.settings.nameVerticalOffset.toString());
                cb.onChange(value => {
                    const intValue = parseInt(value);
                    if (!isNaN(intValue)) {
                        PluginInstances.settings.nameVerticalOffset = intValue;
                        PluginInstances.plugin.saveSettings();
                    }
                });
            }).settingEl);
    }

}