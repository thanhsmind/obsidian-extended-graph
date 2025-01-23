import { Setting } from "obsidian";
import { ExtendedGraphSettingTab } from "./settingTab";
import { isPropertyKeyValid } from "src/helperFunctions";
import { SettingsSectionCollapsible } from "./settingCollapsible";

export class SettingImages extends SettingsSectionCollapsible {
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'images', '', "Images", 'image', "Display image on top of nodes")
    }

    protected override addBody() {
        this.addImageProperty();
        this.addBorderFactor();
    }

    private addImageProperty() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName('Image property')
            .setDesc('Name of the propery used to query the image of the node\'s note.')
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
            .setName('Border width (%)')
            .setDesc('Percentage of the node\'s background that will stay visible as a border.')
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