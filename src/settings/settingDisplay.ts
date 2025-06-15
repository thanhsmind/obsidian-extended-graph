import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, FeatureSetting, PluginInstances, SettingsSection } from "src/internal";
import STRINGS from "src/Strings";

export class SettingDisplay extends SettingsSection {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'display', STRINGS.features.otherDisplay, 'monitor', "");
    }

    protected override addBody() {
        this.addBorderUnresolved();
        this.addLinkSameColorAsNodes();
        this.addSpreadArcs();
        this.addWeightArcs();
        this.addBrightness();
        this.addAnimateDotsOnLinks();
        this.addAnimationSpeedForDot();
        this.addHorizontalLegend();
    }


    private addBorderUnresolved() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(STRINGS.features.borderUnresolved)
            .setDesc(STRINGS.features.borderUnresolvedDesc)
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
            STRINGS.features.linksSameColorAsNode,
            STRINGS.features.linksSameColorAsNodeDesc,
            'linksSameColorAsNode'
        ).settingEl);
    }

    private addSpreadArcs() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(STRINGS.features.interactives.arcsSpread)
            .setDesc(STRINGS.features.interactives.arcsSpreadDesc)
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
            .setName(STRINGS.features.interactives.arcWeight)
            .setDesc(STRINGS.features.interactives.arcWeightDesc)
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
            .setName(STRINGS.features.brightness)
            .setDesc(STRINGS.features.brightnessDesc)
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.inputEl.insertAdjacentText('beforebegin', STRINGS.plugin.light);
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
                cb.inputEl.insertAdjacentText('beforebegin', STRINGS.plugin.dark);
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

    private addAnimateDotsOnLinks() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(STRINGS.features.animateDotsOnLinks)
            .setDesc(STRINGS.features.animateDotsOnLinksDesc)
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
            .setName(STRINGS.features.animateDotsOnLinksSpeed)
            .setDesc(STRINGS.features.animateDotsOnLinksSpeedDesc)
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

    private addHorizontalLegend() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(STRINGS.UI.horizontalLegend)
            .setDesc(STRINGS.UI.horizontalLegendDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.horizontalLegend);
                cb.onChange(value => {
                    PluginInstances.settings.horizontalLegend = value;
                    PluginInstances.plugin.saveSettings();
                });
            }).settingEl);
    }

}