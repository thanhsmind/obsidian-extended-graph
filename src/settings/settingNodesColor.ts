import { setIcon, Setting } from "obsidian";
import { ExtendedGraphSettingTab, NodeStatCalculatorFactory, NodeStatFunction, nodeStatFunctionLabels, SettingColorPalette, SettingsSectionCollapsible } from "src/internal";

export class SettingNodeColor extends SettingsSectionCollapsible {
    warningSetting: Setting;
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'node-color', '', "Nodes colors", 'palette', "Choose the color of the nodes based on a statistic.");
    }

    protected override addBody(): void {
        this.addNodeColorFunction();
        this.addWarning();
        this.addColorPaletteSetting();
    }

    private addNodeColorFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName('Node color function')
            .setDesc("Select how the graph engine should compute the color of the nodes.")
            .addDropdown(cb => {
                cb.addOptions(nodeStatFunctionLabels);
                cb.setValue(this.settingTab.plugin.settings.nodeColorFunction);
                cb.onChange((value) => {
                    this.recomputeNodeColors(value as NodeStatFunction);
                });
            });
            
        this.elementsBody.push(setting.settingEl);
    }
    
    private addColorPaletteSetting(): void {
        const setting = new SettingColorPalette(this.containerEl, this.settingTab.plugin.app, 'node-color')
            .setDesc(`Choose the color palette for the nodes`);

        setting.setValue(this.settingTab.plugin.settings.nodeColorColormap);

        setting.onPaletteChange((palette: string) => {
            this.settingTab.plugin.settings.nodeColorColormap = palette;
            this.settingTab.plugin.app.workspace.trigger('extended-graph:settings-nodecolorpalette-changed');
            this.settingTab.plugin.saveSettings();
        });

        // Push to body list
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
        const warning = this.settingTab.plugin.graphsManager.nodeColorCalculator?.getWarning();
        if (warning && warning !== "") {
            this.warningSetting.setDesc(warning);
            this.warningSetting.settingEl.style.setProperty("display", "");
        }
        else {
            this.warningSetting.setDesc("");
            this.warningSetting.settingEl.style.setProperty("display", "none");
        }
    }

    private recomputeNodeColors(functionKey: NodeStatFunction): void {
        this.settingTab.plugin.settings.nodeColorFunction = functionKey;
        this.settingTab.plugin.graphsManager.nodeColorCalculator = NodeStatCalculatorFactory.getCalculator(functionKey, this.settingTab.app, this.settingTab.plugin.settings, 'color');
        this.settingTab.plugin.graphsManager.nodeColorCalculator?.computeStats();
        this.setWarning();
        this.settingTab.plugin.saveSettings();
    }
}