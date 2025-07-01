import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, PluginInstances, SettingsSectionPerGraphType, t } from "src/internal";

export class SettingArrows extends SettingsSectionPerGraphType {
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'arrows', '', t("features.arrows"), 'mouse-pointer-2', t("features.arrowsDesc"));
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
            .setName(t("features.arrowsInvert"))
            .setDesc(t("features.arrowsInvertDesc"))
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
            .setName(t("features.arrowsFlat"))
            .setDesc(t("features.arrowsFlatDesc"))
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
            .setName(t("features.arrowsOpaque"))
            .setDesc(t("features.arrowsOpaqueDesc"))
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', t("features.arrowsOpaqueKeepFading"));
                cb.setValue(PluginInstances.settings.opaqueArrowsButKeepFading);
                cb.onChange(value => {
                    PluginInstances.settings.opaqueArrowsButKeepFading = value;
                    PluginInstances.plugin.saveSettings();
                })
            })
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', t("features.arrowsOpaqueAlways"));
                cb.setValue(PluginInstances.settings.alwaysOpaqueArrows);
                cb.onChange(value => {
                    PluginInstances.settings.alwaysOpaqueArrows = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addScaleArrow() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.arrowsScale"))
            .setDesc(t("features.arrowsScaleDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
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
            .setName(t("features.arrowsFixedSize"))
            .setDesc(t("features.arrowsFixedSizeDesc"))
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
            .setName(t("features.arrowsColor"))
            .setDesc(t("features.arrowsColorDesc"))
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