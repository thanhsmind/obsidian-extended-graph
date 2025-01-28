import { setIcon, Setting } from "obsidian";
import { ExtendedGraphSettingTab, isPropertyKeyValid, NodeShape, NodeStatCalculatorFactory, NodeStatFunction, nodeStatFunctionLabels, SettingsSectionCollapsible } from "src/internal";
import STRINGS from "src/Strings";

export class SettingNodeSize extends SettingsSectionCollapsible {
    warningSetting: Setting;
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'node-size', '', STRINGS.features.nodeSizes, 'circle-arrow-out-up-right', STRINGS.features.nodeSizesDesc);
    }

    protected override addBody(): void {
        this.addNodeSizeProperty();
        this.addNodeSizeFunction();
        this.addWarning();
    }

    private addNodeSizeProperty(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.nodeSizesProperty)
            .setDesc(STRINGS.features.nodeSizesPropertyDesc)
            .addText(cb => cb
                .setValue(this.settingTab.plugin.settings.nodeSizeProperty)
                .onChange(async (key) => {
                    if (key === "" || isPropertyKeyValid(key)) {
                        this.settingTab.plugin.settings.nodeSizeProperty = key;
                        await this.settingTab.plugin.saveSettings();
                    }
            }));
            
        this.elementsBody.push(setting.settingEl);
    }

    private addNodeSizeFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.nodeSizesFunction)
            .setDesc(STRINGS.features.nodeSizesFunctionDesc)
            .addDropdown(cb => {
                cb.addOptions(nodeStatFunctionLabels);
                cb.setValue(this.settingTab.plugin.settings.nodeSizeFunction);
                cb.onChange((value) => {
                    this.recomputeNodeSizes(value as NodeStatFunction);
                });
            });
            
        this.elementsBody.push(setting.settingEl);
    }

    private addWarning(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setClass("setting-warning")
            .then(cb => {
                setIcon(cb.nameEl, 'triangle-alert');
            });
            
        this.elementsBody.push(setting.settingEl);
        this.warningSetting = setting;
        this.setWarning();
    }

    private setWarning(): void {
        const warning = this.settingTab.plugin.graphsManager.nodeSizeCalculator?.getWarning();
        if (warning && warning !== "") {
            this.warningSetting.setDesc(warning);
            this.warningSetting.settingEl.style.setProperty("display", "");
        }
        else {
            this.warningSetting.setDesc("");
            this.warningSetting.settingEl.style.setProperty("display", "none");
        }
    }

    private recomputeNodeSizes(functionKey: NodeStatFunction): void {
        this.settingTab.plugin.settings.nodeSizeFunction = functionKey;
        this.settingTab.plugin.graphsManager.nodeSizeCalculator = NodeStatCalculatorFactory.getCalculator(functionKey, this.settingTab.app, this.settingTab.plugin.settings, 'size');
        this.settingTab.plugin.graphsManager.nodeSizeCalculator?.computeStats();
        this.setWarning();
        this.settingTab.plugin.saveSettings();
    }
}