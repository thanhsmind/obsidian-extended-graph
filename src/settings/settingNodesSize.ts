import { setIcon, Setting } from "obsidian";
import { ExtendedGraphSettingTab, isPropertyKeyValid, NodeShape, NodeSizeCalculatorFactory, NodeSizeFunction, nodeSizeFunctionLabels, SettingsSectionCollapsible } from "src/internal";

export class SettingNodeSize extends SettingsSectionCollapsible {
    allTopElements: HTMLElement[] = [];
    warningSetting: Setting;
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'node-size', '', "Nodes size", 'circle-arrow-out-up-right', "Choose how nodes sizes must be computed");
    }

    protected override addBody(): void {
        this.addNodeSizeProperty();
        this.addNodeSizeFunction();
        this.addWarning();
    }

    private addNodeSizeProperty(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName('Node size property')
            .setDesc(`Name of the property used to specify the size of the node. It must be of type number. A value of ${NodeShape.RADIUS} is the default. Leave empty if you don't need a per-node granularity.`)
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
            .setName('Node size function')
            .setDesc("Select how the graph engine should compute the size of the nodes.")
            .addDropdown(cb => {
                cb.addOptions(nodeSizeFunctionLabels);
                cb.setValue(this.settingTab.plugin.settings.nodeSizeFunction);
                cb.onChange((value) => {
                    this.recomputeNodeSizes(value as NodeSizeFunction);
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

    private recomputeNodeSizes(functionKey: NodeSizeFunction): void {
        this.settingTab.plugin.settings.nodeSizeFunction = functionKey;
        this.settingTab.plugin.graphsManager.nodeSizeCalculator = NodeSizeCalculatorFactory.getCalculator(functionKey, this.settingTab.app);
        this.settingTab.plugin.graphsManager.nodeSizeCalculator?.computeSizes();
        this.setWarning();
        this.settingTab.plugin.saveSettings();
    }
}