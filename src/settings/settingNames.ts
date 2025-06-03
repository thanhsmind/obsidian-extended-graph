import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, isPropertyKeyValid, PluginInstances, SettingsSectionPerGraphType } from "src/internal";
import STRINGS from "src/Strings";
import { SettingMultiPropertiesModal } from "src/ui/modals/settingPropertiesModal";

export class SettingNames extends SettingsSectionPerGraphType {
    verticalOffset: Setting;

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'names', '', STRINGS.features.names, 'case-sensitive', STRINGS.features.namesDesc);
    }

    protected override addBody() {
        this.addInterfaceFont();
        this.addShowWhenNeighborHighlighted();
        this.addLinkedNamesScale();
        this.addLinkedNamesScaleThreshold();
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
            .setName(STRINGS.features.namesUseProperties)
            .setDesc(STRINGS.features.namesUsePropertiesDesc)
            .addExtraButton(cb => {
                cb.setIcon('mouse-pointer-click');
                cb.onClick(() => {
                    const modal = new SettingMultiPropertiesModal(
                        STRINGS.features.namesUseProperties,
                        STRINGS.features.namesUsePropertiesAdd,
                        PluginInstances.settings.usePropertiesForName
                    );
                    modal.open();
                })
            }
            ).settingEl);
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

    private addShowWhenNeighborHighlighted() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.namesShowWhenNeighborHighlighted)
            .setDesc(STRINGS.features.namesShowWhenNeighborHighlightedDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.showNamesWhenNeighborHighlighted);
                cb.onChange(value => {
                    PluginInstances.settings.showNamesWhenNeighborHighlighted = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addLinkedNamesScale() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName("Linked labels scale when a node is hovered")
            .setDesc("Change the scale of the labels of the linked node when one is hovered. Set between 0 (default) and 1 (same as the highlighted node).")
            .addText(cb => cb
                .setValue(PluginInstances.settings.linkedNamesScale.toString())
                .onChange(async (value) => {
                    if (value === '') {
                        PluginInstances.settings.linkedNamesScale = 0;
                        await PluginInstances.plugin.saveSettings();
                    }
                    const floatValue = parseFloat(value);
                    if (!isNaN(floatValue)) {
                        PluginInstances.settings.linkedNamesScale = Math.clamp(floatValue, 0, 1);
                        await PluginInstances.plugin.saveSettings();
                    }
                })).settingEl);
    }

    private addLinkedNamesScaleThreshold() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName("Zoom threshold to show linked labels")
            .setDesc("If the graph is zoomed out more than this value, labels of nodes linked to the highlighted one won't be displayed. 0.1 is a good starting value, decrease it to allow text to be displayed longer while zooming out. Leave empty to always show the labels.")
            .addText(cb => cb
                .setValue((PluginInstances.settings.linkedNamesScaleThreshold || '').toString())
                .onChange(async (value) => {
                    if (value === '') {
                        PluginInstances.settings.linkedNamesScaleThreshold = null;
                        await PluginInstances.plugin.saveSettings();
                    }
                    const floatValue = parseFloat(value);
                    if (!isNaN(floatValue)) {
                        PluginInstances.settings.linkedNamesScaleThreshold = floatValue;
                        await PluginInstances.plugin.saveSettings();
                    }
                })).settingEl);
    }

}