import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, isPropertyKeyValid, SettingsSectionCollapsible } from "src/internal";
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
                .setValue(this.settingTab.plugin.settings.imageProperty)
                .onChange(async (key) => {
                    if (isPropertyKeyValid(key)) {
                        this.settingTab.plugin.settings.imageProperty = key;
                        await this.settingTab.plugin.saveSettings();
                    }
            }));
            
        this.elementsBody.push(setting.settingEl);
    }

    private addBorderFactor() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.imageBorderWidth)
            .setDesc(STRINGS.features.imageBorderWidthDesc)
            .addSlider(cb => {
                const preview = document.createTextNode(this.settingTab.plugin.settings.borderFactor.toString() + "%");
                if (preview) {
                    cb.sliderEl.parentElement?.insertBefore(preview, cb.sliderEl);
                }
                cb.setLimits(0, 50, 1)
                    .setValue(this.settingTab.plugin.settings.borderFactor * 100)
                    .onChange(value => {
                        this.settingTab.plugin.settings.borderFactor = value / 100;
                        if (preview) preview.textContent = this.settingTab.plugin.settings.borderFactor.toString() + "%";
                        this.settingTab.plugin.saveSettings();
                    });
            });
        setting.controlEl.addClass("setting-item-description");

        this.elementsBody.push(setting.settingEl);
    }
}