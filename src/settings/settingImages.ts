import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, isPropertyKeyValid, PluginInstances, SettingsSectionCollapsible } from "src/internal";
import STRINGS from "src/Strings";

export class SettingImages extends SettingsSectionCollapsible {
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'images', '', STRINGS.features.image, 'image', STRINGS.features.imageDesc)
    }

    protected override addBody() {
        this.addImageProperty();
        this.addBorderFactor();
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