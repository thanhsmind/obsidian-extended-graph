import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, FeatureSetting, PluginInstances, SettingsSection } from "src/internal";
import STRINGS from "src/Strings";
import { SettingMultiPropertiesModal } from "src/ui/modals/settingPropertiesModal";

export class SettingImages extends SettingsSection {
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'images', STRINGS.features.image, 'image', STRINGS.features.imageDesc);
    }

    protected override addBody() {
        this.addImagesFromProperties();
        this.addImagesFromEmbeds();
        this.addImagesForAttachments();
        this.addBorderFactor();
        this.addAllowExternal();
    }

    private addImagesFromProperties() {
        this.elementsBody.push(new FeatureSetting(
            this.settingTab.containerEl,
            STRINGS.features.imagesFromProperty,
            STRINGS.features.imagesFromPropertyDesc,
            'imagesFromProperty'
        ).settingEl);


        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.imageProperties)
            .setDesc(STRINGS.features.imagePropertiesDesc)
            .addExtraButton(cb => {
                cb.setIcon('mouse-pointer-click');
                cb.onClick(() => {
                    const modal = new SettingMultiPropertiesModal(
                        STRINGS.features.imageProperties,
                        STRINGS.features.imagePropertiesAdd,
                        PluginInstances.settings.imageProperties
                    );
                    modal.open();
                })
            }
            ).settingEl);
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