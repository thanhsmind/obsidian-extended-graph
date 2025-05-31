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
        this.addAnimateDotsOnLinks();
        this.addAnimationSpeedForDot();
    }


    private addBorderUnresolved() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(STRINGS.features.borderUnresolved)
            .setDesc(STRINGS.features.borderUnresolvedDesc)
            .addText(cb => cb
                .setValue(PluginInstances.settings.borderUnresolved.toString())
                .onChange(async (value) => {
                    if (value === '') {
                        PluginInstances.settings.borderUnresolved = '';
                        await PluginInstances.plugin.saveSettings();
                    }
                    const intValue = parseFloat(value);
                    if (!isNaN(intValue)) {
                        PluginInstances.settings.borderUnresolved = Math.clamp(intValue, 0, 1);
                        await PluginInstances.plugin.saveSettings();
                    }
                })).settingEl);
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
            .addText(cb => cb
                .setValue(PluginInstances.settings.animationSpeedForDots.toString())
                .onChange(async (value) => {
                    const floatValue = parseFloat(value);
                    if (!isNaN(floatValue) && floatValue > 0) {
                        PluginInstances.settings.animationSpeedForDots = floatValue;
                        await PluginInstances.plugin.saveSettings();
                    }
                })).settingEl);
    }

}