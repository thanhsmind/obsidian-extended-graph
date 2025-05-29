import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, PluginInstances, SettingsSectionPerGraphType } from "src/internal";
import STRINGS from "src/Strings";

export class SettingArrows extends SettingsSectionPerGraphType {
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'arrows', '', STRINGS.features.arrows, 'mouse-pointer-2', STRINGS.features.arrowsDesc);
    }

    protected override addBody() {
        this.addInvertArrows();
        this.addFlatArrows();
        this.addOpaqueArrows();
        this.addScaleArrow();
        this.addColorArrow();
    }

    private addInvertArrows() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.arrowsInvert)
            .setDesc(STRINGS.features.arrowsInvertDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.invertArrows);
                cb.onChange(value => {
                    PluginInstances.settings.invertArrows = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addFlatArrows() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.arrowsFlat)
            .setDesc(STRINGS.features.arrowsFlatDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.flatArrows);
                cb.onChange(value => {
                    PluginInstances.settings.flatArrows = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addOpaqueArrows() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.arrowsOpaque)
            .setDesc(STRINGS.features.arrowsOpaqueDesc)
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', STRINGS.features.arrowsOpaqueKeepFading);
                cb.setValue(PluginInstances.settings.opaqueArrowsButKeepFading);
                cb.onChange(value => {
                    PluginInstances.settings.opaqueArrowsButKeepFading = value;
                    PluginInstances.plugin.saveSettings();
                })
            })
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', STRINGS.features.arrowsOpaqueAlways);
                cb.setValue(PluginInstances.settings.alwaysOpaqueArrows);
                cb.onChange(value => {
                    PluginInstances.settings.alwaysOpaqueArrows = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addScaleArrow() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.arrowsScale)
            .setDesc(STRINGS.features.arrowsScaleDesc)
            .addText(cb => {
                cb.setValue(PluginInstances.settings.arrowScale.toString())
                    .onChange(async (value) => {
                        if (value === '') {
                            PluginInstances.settings.arrowScale = 1;
                            await PluginInstances.plugin.saveSettings();
                        }
                        const floatValue = parseFloat(value);
                        if (!isNaN(floatValue)) {
                            PluginInstances.settings.arrowScale = Math.max(0.1, floatValue);
                            await PluginInstances.plugin.saveSettings();
                        }
                    });
            }).settingEl);


        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.arrowsFixedSize)
            .setDesc(STRINGS.features.arrowsFixedSizeDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.arrowFixedSize);
                cb.onChange(value => {
                    PluginInstances.settings.arrowFixedSize = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addColorArrow() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.arrowsColor)
            .setDesc(STRINGS.features.arrowsColorDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.arrowColorBool);
                cb.onChange(value => {
                    PluginInstances.settings.arrowColorBool = value;
                    PluginInstances.plugin.saveSettings();
                })
            })
            .addColorPicker(cb => {
                cb.setValue(PluginInstances.settings.arrowColor);
                cb.onChange(value => {
                    PluginInstances.settings.arrowColor = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }
}