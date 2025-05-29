import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, FeatureSetting, graphTypeLabels, isPropertyKeyValid, PluginInstances, SettingsSection } from "src/internal";
import STRINGS from "src/Strings";

export class SettingImages extends SettingsSection {
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'images', STRINGS.features.image, 'image', STRINGS.features.imageDesc);
    }

    protected override addBody() {
        this.addImagesFromProperty();
        this.addImagesFromEmbeds();
        this.addImagesForAttachments();
        this.addBorderFactor();
        this.addAllowExternal();
    }

    private addImagesFromProperty() {
        this.elementsBody.push(new FeatureSetting(
            this.settingTab.containerEl,
            STRINGS.features.imagesFromProperty,
            STRINGS.features.imagesFromPropertyDesc,
            'imagesFromProperty'
        ).settingEl);

        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.imageProperty)
            .setDesc(STRINGS.features.imagePropertyDesc)
            .addText(cb => cb
                .setValue(PluginInstances.settings.imageProperty)
                .onChange(async (key) => {
                    if (isPropertyKeyValid(key)) {
                        PluginInstances.settings.imageProperty = key;
                        await PluginInstances.plugin.saveSettings();
                    }
                })).settingEl);
    }

    private addImagesFromEmbeds() {
        this.elementsBody.push(new FeatureSetting(
            this.settingTab.containerEl,
            STRINGS.features.imagesFromEmbeds,
            STRINGS.features.imagesFromEmbedsDesc,
            'imagesFromEmbeds'
        ).settingEl);
    }

    private addImagesForAttachments() {
        this.elementsBody.push(new FeatureSetting(
            this.settingTab.containerEl,
            STRINGS.features.imagesForAttachments,
            STRINGS.features.imagesForAttachmentsDesc,
            'imagesForAttachments'
        ).settingEl);
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

    private addAllowExternal() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.imagesAllowExternal)
            .setDesc(STRINGS.features.imagesAllowExternalDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.allowExternalImages);
                cb.onChange(value => {
                    PluginInstances.settings.allowExternalImages = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);

        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.imagesAllowExternalLocal)
            .setDesc(STRINGS.features.imagesAllowExternalLocalDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.allowExternalLocalImages);
                cb.onChange(value => {
                    PluginInstances.settings.allowExternalLocalImages = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }
}