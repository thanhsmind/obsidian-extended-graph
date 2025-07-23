import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, FeatureSetting, getCMapData, PluginInstances, SettingColorPalette, SettingsSection, t } from "src/internal";

export class SettingDisplay extends SettingsSection {
    depthColormapSetting: SettingColorPalette;

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'display', t("features.otherDisplay"), 'monitor', "");
    }

    protected override addBody() {
        this.addBorderUnresolved();
        this.addLinkSameColorAsNodes();
        this.addNoLineHighlight();
        this.addSpreadArcs();
        this.addWeightArcs();
        this.addBrightness();
        this.addFadeInElements();
        this.addAnimateDotsOnLinks();
        this.addAnimationSpeedForDot();
        this.addColorBasedOnDepth();
        this.addHorizontalLegend();
    }


    private addBorderUnresolved() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.borderUnresolved"))
            .setDesc(t("features.borderUnresolvedDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(PluginInstances.settings.borderUnresolved.toString())
                    .onChange(async (value) => {
                        if (value === '') {
                            PluginInstances.settings.borderUnresolved = '';
                            await PluginInstances.plugin.saveSettings();
                        }
                        const floatValue = parseFloat(value);
                        if (!isNaN(floatValue)) {
                            PluginInstances.settings.borderUnresolved = Math.clamp(floatValue, 0, 1);
                            await PluginInstances.plugin.saveSettings();
                        }
                    })
            }).settingEl);
    }

    private addLinkSameColorAsNodes() {
        this.elementsBody.push(new FeatureSetting(
            this.containerEl,
            t("features.linksSameColorAsNode"),
            t("features.linksSameColorAsNodeDesc"),
            'linksSameColorAsNode'
        ).settingEl);
    }

    private addNoLineHighlight() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.noLineHighlight"))
            .setDesc(t("features.noLineHighlightDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.noLineHighlight || false);
                cb.onChange(value => {
                    PluginInstances.settings.noLineHighlight = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addSpreadArcs() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.interactives.arcsSpread"))
            .setDesc(t("features.interactives.arcsSpreadDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.spreadArcs || false);
                cb.onChange(value => {
                    PluginInstances.settings.spreadArcs = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addWeightArcs() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.interactives.arcWeight"))
            .setDesc(t("features.interactives.arcWeightDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.weightArcs || false);
                cb.onChange(value => {
                    PluginInstances.settings.weightArcs = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addBrightness() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.brightness"))
            .setDesc(t("features.brightnessDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.inputEl.insertAdjacentText('beforebegin', t("plugin.light"));
                cb.setValue(PluginInstances.settings.interactivesBrightness.light.toString());
                cb.onChange(value => {
                    if (value === '') {
                        PluginInstances.settings.interactivesBrightness.light = 1;
                        PluginInstances.plugin.saveSettings();
                    }
                    const floatValue = parseFloat(value);
                    if (!isNaN(floatValue)) {
                        PluginInstances.settings.interactivesBrightness.light = Math.max(floatValue, 0);
                        PluginInstances.plugin.saveSettings();
                    }
                })
            })
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.inputEl.insertAdjacentText('beforebegin', t("plugin.dark"));
                cb.setValue(PluginInstances.settings.interactivesBrightness.dark.toString());
                cb.onChange(value => {
                    if (value === '') {
                        PluginInstances.settings.interactivesBrightness.dark = 1;
                        PluginInstances.plugin.saveSettings();
                    }
                    const floatValue = parseFloat(value);
                    if (!isNaN(floatValue)) {
                        PluginInstances.settings.interactivesBrightness.dark = Math.max(floatValue, 0);
                        PluginInstances.plugin.saveSettings();
                    }
                })
            })
            .settingEl);
    }

    private addFadeInElements() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.fadeInElements"))
            .setDesc(t("features.fadeInElementsDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.fadeInElements);
                cb.onChange(value => {
                    PluginInstances.settings.fadeInElements = value;
                    PluginInstances.plugin.saveSettings();
                });
            }).settingEl);
    }

    private addAnimateDotsOnLinks() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.animateDotsOnLinks"))
            .setDesc(t("features.animateDotsOnLinksDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.animateDotsOnLinks || false);
                cb.onChange(value => {
                    PluginInstances.settings.animateDotsOnLinks = value;
                    PluginInstances.plugin.saveSettings();
                });
            }).settingEl);
    }

    private addAnimationSpeedForDot() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.animateDotsOnLinksSpeed"))
            .setDesc(t("features.animateDotsOnLinksSpeedDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(PluginInstances.settings.animationSpeedForDots.toString())
                    .onChange(async (value) => {
                        const floatValue = parseFloat(value);
                        if (!isNaN(floatValue) && floatValue > 0) {
                            PluginInstances.settings.animationSpeedForDots = floatValue;
                            await PluginInstances.plugin.saveSettings();
                        }
                    })
            }).settingEl);
    }

    private addColorBasedOnDepth() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.colorBasedOnDepth"))
            .setDesc(t("features.colorBasedOnDepthDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.colorBasedOnDepth)
                    .onChange(async (value) => {
                        PluginInstances.settings.colorBasedOnDepth = value;
                        PluginInstances.plugin.saveSettings();
                        this.depthColormapSetting.setVisibility(value);
                    })
            }).settingEl);

        this.depthColormapSetting = new SettingColorPalette(this.containerEl, this.settingTab, 'depth-color')
            .setName(t("features.depthPalette"))
            .setDesc(t("features.depthPaletteDesc"));

        this.depthColormapSetting.setValue(PluginInstances.settings.depthColormap);

        this.depthColormapSetting.onPaletteChange((palette: string) => {
            PluginInstances.settings.depthColormap = palette;
            PluginInstances.plugin.saveSettings();
        });

        this.depthColormapSetting.setVisibility(PluginInstances.settings.colorBasedOnDepth);

        // Push to body list
        this.elementsBody.push(this.depthColormapSetting.settingEl);
    }

    onCustomPaletteModified(oldName: string, newName: string): void {
        // Check if the colormap is no longer in the settings
        if (!getCMapData(PluginInstances.settings.depthColormap, PluginInstances.settings)) {
            // If the old name matches AND the new name is valid, change the name
            if (PluginInstances.settings.depthColormap === oldName && getCMapData(newName, PluginInstances.settings)) {
                PluginInstances.settings.depthColormap = newName;
            }
            // Otherwise, reset it
            else {
                PluginInstances.settings.depthColormap = "rainbow";
            }
        }
        this.depthColormapSetting.populateCustomOptions();
        this.depthColormapSetting.setValue(PluginInstances.settings.depthColormap);
    }

    private addHorizontalLegend() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("UI.horizontalLegend"))
            .setDesc(t("UI.horizontalLegendDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.horizontalLegend);
                cb.onChange(value => {
                    PluginInstances.settings.horizontalLegend = value;
                    PluginInstances.plugin.saveSettings();
                });
            }).settingEl);
    }

}