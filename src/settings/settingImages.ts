import { Setting } from "obsidian";
import { ExtendedGraphSettingTab } from "./settingTab";
import { isPropertyKeyValid } from "src/helperFunctions";
import { addHeading } from "./settingHelperFunctions";

export class SettingImages {
    settingTab: ExtendedGraphSettingTab;
    allTopElements: HTMLElement[] = [];
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        this.settingTab = settingTab;
    }

    display() {
        addHeading({
            containerEl: this.settingTab.containerEl,
            heading: "Images",
            icon: 'image',
            description: "Display image on top of nodes",
            displayCSSVariable: '--display-image-features',
            enable: this.settingTab.plugin.settings.enableImages,
            updateToggle: (function (value: boolean) {
                this.settingTab.plugin.settings.enableImages = value;
            }).bind(this),
            settingTab: this.settingTab
        })

        this.addImageProperty();
        this.addBorderFactor();

        this.allTopElements.forEach(el => {
            el.addClass("extended-graph-setting-image");
        })
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
            
        this.allTopElements.push(setting.settingEl);
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
                    .onChange(async (value) => {
                        this.settingTab.plugin.settings.borderFactor = value / 100;
                        if (preview) preview.textContent = this.settingTab.plugin.settings.borderFactor.toString() + "%";
                        await this.settingTab.plugin.saveSettings();
                    });
                
            });
        setting.controlEl.addClass("setting-item-description");

        this.allTopElements.push(setting.settingEl);
    }
}