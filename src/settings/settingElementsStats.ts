import { DropdownComponent, setIcon, Setting } from "obsidian";
import { ExtendedGraphSettingTab, GraphAnalysisPlugin, isPropertyKeyValid, LinkStatCalculator, LinkStatFunction, linkStatFunctionLabels, linkStatFunctionNeedsNLP, NodeStatCalculatorFactory, NodeStatFunction, nodeStatFunctionLabels, SettingColorPalette, SettingsSectionCollapsible } from "src/internal";
import STRINGS from "src/Strings";

export class SettingElementsStats extends SettingsSectionCollapsible {
    warningNodeSizeSetting: Setting;
    warningNodeColorSetting: Setting;
    linksSizeFunctionDropdown: DropdownComponent | undefined;
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'elements-stats', '', STRINGS.features.elementsStats, 'chart-pie', STRINGS.features.elementsStatsDesc);
    }

    protected override addBody(): void {
        this.addNodeSizeProperty();
        this.addNodeSizeFunction();
        this.addNodeSizeWarning();

        this.addNodeColorFunction();
        this.addNodeColorWarning();
        this.addColorPaletteSetting();

        if (this.settingTab.plugin.graphsManager?.getGraphAnalysis()["graph-analysis"]) {
            this.addLinkSizeFunction();
        }
    }

    private addNodeSizeProperty(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.nodeSizesProperty)
            .setDesc(STRINGS.features.nodeSizesPropertyDesc)
            .addText(cb => cb
                .setValue(this.settingTab.plugin.settings.nodesSizeProperty)
                .onChange(async (key) => {
                    if (key === "" || isPropertyKeyValid(key)) {
                        this.settingTab.plugin.settings.nodesSizeProperty = key;
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
                cb.setValue(this.settingTab.plugin.settings.nodesSizeFunction);
                cb.onChange((value) => {
                    this.recomputeNodesSizes(value as NodeStatFunction);
                });
            });
            
        this.elementsBody.push(setting.settingEl);
    }

    private addLinkSizeFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.linkSizesFunction)
            .setDesc(STRINGS.features.linkSizesFunctionDesc)
            .addDropdown(cb => {
                this.linksSizeFunctionDropdown = cb;
                const nlp = this.settingTab.plugin.graphsManager?.getGraphAnalysis().nlp;
                cb.addOptions(
                    Object.fromEntries(Object.entries(linkStatFunctionLabels)
                        .filter(entry => !linkStatFunctionNeedsNLP[entry[0] as LinkStatFunction] || nlp)
                    )
                );
                cb.setValue(this.settingTab.plugin.settings.linksSizeFunction);
                cb.onChange((value) => {
                    this.recomputeLinksSizes(value as LinkStatFunction);
                });
            });
            
        this.elementsBody.push(setting.settingEl);
    }

    private addNodeSizeWarning(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setClass("setting-warning")
            .then(cb => {
                setIcon(cb.nameEl, 'triangle-alert');
            });
            
        this.elementsBody.push(setting.settingEl);
        this.warningNodeSizeSetting = setting;
        this.setWarning(setting);
    }
    
    private addNodeColorFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.nodeColorsFunction)
            .setDesc(STRINGS.features.nodeColorsFunctionDesc)
            .addDropdown(cb => {
                cb.addOptions(nodeStatFunctionLabels);
                cb.setValue(this.settingTab.plugin.settings.nodesColorFunction);
                cb.onChange((value) => {
                    this.recomputeNodeColors(value as NodeStatFunction);
                });
            });
            
        this.elementsBody.push(setting.settingEl);
    }
    
    private addColorPaletteSetting(): void {
        const setting = new SettingColorPalette(this.containerEl, this.settingTab.plugin.app, 'elements-stats')
            .setDesc(STRINGS.features.nodeColorsPaletteDesc);

        setting.setValue(this.settingTab.plugin.settings.nodesColorColormap);

        setting.onPaletteChange((palette: string) => {
            this.settingTab.plugin.settings.nodesColorColormap = palette;
            this.settingTab.plugin.app.workspace.trigger('extended-graph:settings-nodecolorpalette-changed');
            this.settingTab.plugin.saveSettings();
        });

        // Push to body list
        this.elementsBody.push(setting.settingEl);
    }

    private addNodeColorWarning(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setClass("setting-warning")
            .then(cb => {
                setIcon(cb.nameEl, 'triangle-alert');
            });
            
        this.elementsBody.push(setting.settingEl);
        this.warningNodeColorSetting = setting;
        this.setWarning(setting);
    }







    private setWarning(warningSetting: Setting): void {
        const warning = this.settingTab.plugin.graphsManager?.nodesSizeCalculator?.getWarning();
        if (warning && warning !== "") {
            warningSetting.setDesc(warning);
            warningSetting.settingEl.style.setProperty("display", "");
        }
        else {
            warningSetting.setDesc("");
            warningSetting.settingEl.style.setProperty("display", "none");
        }
    }

    private recomputeNodesSizes(functionKey: NodeStatFunction): void {
        this.settingTab.plugin.settings.nodesSizeFunction = functionKey;
        this.settingTab.plugin.saveSettings();

        this.settingTab.plugin.graphsManager.nodesSizeCalculator = NodeStatCalculatorFactory.getCalculator(functionKey, this.settingTab.app, this.settingTab.plugin.settings, 'size');
        this.settingTab.plugin.graphsManager.nodesSizeCalculator?.computeStats();
        this.setWarning(this.warningNodeSizeSetting);
    }

    private recomputeNodeColors(functionKey: NodeStatFunction): void {
        this.settingTab.plugin.settings.nodesColorFunction = functionKey;
        this.settingTab.plugin.graphsManager.nodeColorCalculator = NodeStatCalculatorFactory.getCalculator(functionKey, this.settingTab.app, this.settingTab.plugin.settings, 'color');
        this.settingTab.plugin.graphsManager.nodeColorCalculator?.computeStats();
        this.setWarning(this.warningNodeColorSetting);
        this.settingTab.plugin.saveSettings();
    }

    private recomputeLinksSizes(functionKey: LinkStatFunction): void {
        const myPlugin = this.settingTab.plugin;
        
        const ga = myPlugin.graphsManager.getGraphAnalysis();
        if (!ga && functionKey !== 'default') {
            return;
        }
        else if (!ga.nlp && linkStatFunctionNeedsNLP[functionKey]) {
            new Notice(`${STRINGS.notices.nlpPluginRequired} (${functionKey})`);
            functionKey = 'default';
            this.linksSizeFunctionDropdown?.setValue(functionKey);
        }
    
        myPlugin.settings.linksSizeFunction = functionKey;
        this.settingTab.plugin.saveSettings();

        if (functionKey === 'default') {
            myPlugin.graphsManager.linksSizeCalculator = undefined;
            return;
        }

        const graphAnalysisPlugin = myPlugin.app.plugins.getPlugin("graph-analysis") as GraphAnalysisPlugin | null;
        if (!graphAnalysisPlugin) return;
        if (!myPlugin.graphsManager.linksSizeCalculator) {
            myPlugin.graphsManager.linksSizeCalculator = new LinkStatCalculator(myPlugin.app, myPlugin.settings, 'size', graphAnalysisPlugin.g);
        }
        myPlugin.graphsManager.linksSizeCalculator.computeStats(myPlugin.settings.linksSizeFunction);
    }
}