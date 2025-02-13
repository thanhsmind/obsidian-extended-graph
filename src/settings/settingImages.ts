import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, graphTypeLabels, isPropertyKeyValid, PluginInstances, SettingsSection } from "src/internal";
import STRINGS from "src/Strings";

export class SettingImages extends SettingsSection {
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, STRINGS.features.image, 'image', STRINGS.features.imageDesc);
    }

    protected override addBody() {
        this.addImageFromProperty();
        this.addBorderFactor();
    }

    private addImageFromProperty() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.imageFromProperty)
            .setDesc(STRINGS.features.imageFromPropertyDesc)
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['graph']);
                cb.setValue(PluginInstances.settings.enableFeatures['graph']['imagesFromProperty']);
                cb.onChange(value => {
                    PluginInstances.settings.enableFeatures['graph']['imagesFromProperty'] = value;
                    PluginInstances.plugin.saveSettings();
                })
            })
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['localgraph']);
                cb.setValue(PluginInstances.settings.enableFeatures['localgraph']['imagesFromProperty']);
                cb.onChange(value => {
                    PluginInstances.settings.enableFeatures['localgraph']['imagesFromProperty'] = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);

        this.addImageProperty();
    }

    private addImageProperty() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.imageProperty)
            .setDesc(STRINGS.features.imagePropertyDesc)
            .addText(cb => cb
                .setValue(PluginInstances.settings.imageProperty)
                .onChange(async (key) => {
                    if (isPropertyKeyValid(key)) {
                        PluginInstances.settings.imageProperty = key;
                        await PluginInstances.plugin.saveSettings();
                    }
            }));
            
        this.elementsBody.push(setting.settingEl);
    }

    private addBorderFactor() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.imageBorderWidth)
            .setDesc(STRINGS.features.imageBorderWidthDesc)
            .addSlider(cb => {
                const preview = document.createTextNode(PluginInstances.settings.borderFactor.toString() + "%");
                if (preview) {
                    cb.sliderEl.parentElement?.insertBefore(preview, cb.sliderEl);
                }
                cb.setLimits(0, 50, 1)
                    .setValue(PluginInstances.settings.borderFactor * 100)
                    .onChange(value => {
                        PluginInstances.settings.borderFactor = value / 100;
                        if (preview) preview.textContent = PluginInstances.settings.borderFactor.toString() + "%";
                        PluginInstances.plugin.saveSettings();
                    });
            });
        setting.controlEl.addClass("setting-item-description");

        this.elementsBody.push(setting.settingEl);
    }
}