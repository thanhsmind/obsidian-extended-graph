import { ExtraButtonComponent, Setting } from "obsidian";
import { ExtendedGraphSettingTab, getCMapData, NodeShape, PluginInstances, SettingColorPalette, SettingsSection, ShapeEnum, t } from "src/internal";

export class SettingLocal extends SettingsSection {
    depthColormapSetting: SettingColorPalette;
    shapesSVGContainer: HTMLElement;

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'local-graph', t("features.ids.localGraph"), t("features.localGraph"), 'map-pin', t("features.localGraphDesc"));
    }

    protected override addBody() {
        this.addColorBasedOnDepth();
        this.addCurrentNodeColor();
        this.addCurrentNodeSize();
        this.addCurrentNodeShape();
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

    private addCurrentNodeColor() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.localGraphCurrentNodeColor"))
            .setDesc(t("features.localGraphCurrentNodeColorDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.currentNode.useColor);
                cb.onChange(async (value) => {
                    PluginInstances.settings.currentNode.useColor = value;
                    await PluginInstances.plugin.saveSettings();
                })
            })
            .addColorPicker(cb => {
                cb.setValue(PluginInstances.settings.currentNode.color);
                cb.onChange(async (hex: string) => {
                    PluginInstances.settings.currentNode.color = hex;
                    await PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addCurrentNodeSize() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.localGraphCurrentNodeSize"))
            .setDesc(t("features.localGraphCurrentNodeSizeDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(PluginInstances.settings.currentNode.size.toString());
                cb.onChange(async (value) => {
                    const intValue = parseInt(value);
                    if (!isNaN(intValue)) {
                        PluginInstances.settings.currentNode.size = Math.max(10, intValue);
                        await PluginInstances.plugin.saveSettings();
                    }
                })
            }).settingEl);
    }

    private addCurrentNodeShape() {
        const setting = new Setting(this.containerEl)
            .setName(t("features.localGraphCurrentNodeShape"))
            .setDesc(t("features.localGraphCurrentNodeShapeDesc"));
        this.elementsBody.push(setting.settingEl);
        this.shapesSVGContainer = setting.controlEl;

        const shapes = Object.values(ShapeEnum);
        for (const shape of shapes) {
            const svg = NodeShape.getSVG(shape);
            svg.addClass("shape-svg");

            const extraButton = new ExtraButtonComponent(this.shapesSVGContainer);
            extraButton.setTooltip(shape);
            extraButton.extraSettingsEl.addClasses(["shape-icon", shape]);
            extraButton.extraSettingsEl.replaceChildren(svg);
            extraButton.onClick(async () => {
                PluginInstances.settings.currentNode.shape = shape;
                await PluginInstances.plugin.saveSettings();
                this.highlightSelectedShape();
            })
        }

        this.highlightSelectedShape();
    }

    private highlightSelectedShape() {
        for (const child of Array.from(this.shapesSVGContainer.querySelectorAll(".shape-icon"))) {
            child.toggleClass("is-active", child.hasClass(PluginInstances.settings.currentNode.shape));
        }
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

}