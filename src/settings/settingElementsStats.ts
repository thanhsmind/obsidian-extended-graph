import { DropdownComponent, setIcon, Setting } from "obsidian";
import {
    ExtendedGraphSettingTab,
    getCMapData,
    getGraphAnalysis,
    LinksStatCalculatorFactory,
    LinkStatFunction,
    linkStatFunctionLabels,
    linkStatFunctionNeedsGraphAnalysis,
    linkStatFunctionNeedsNLP,
    NodeStatCalculatorFactory,
    NodeStatFunction,
    nodeStatFunctionLabels,
    PluginInstances,
    SettingColorPalette,
    SettingsSectionPerGraphType,
    t
} from "src/internal";
import { SettingMultiPropertiesModal } from "src/ui/modals/settingPropertiesModal";

export class SettingElementsStats extends SettingsSectionPerGraphType {
    warningNodeSizeSetting: Setting;
    warningNodeColorSetting: Setting;
    linksSizeFunctionDropdown: DropdownComponent | undefined;
    linksColorFunctionDropdown: DropdownComponent | undefined;
    nodesPaletteSetting: SettingColorPalette;
    linksPaletteSetting: SettingColorPalette;

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'elements-stats', '', t("features.elementsStats"), 'chart-pie', t("features.elementsStatsDesc"));
    }

    protected override addBody(): void {
        this.addNodeSizeProperties();
        this.addNodeSizeFunction();
        this.addNodeSizeWarning();

        this.addNodeColorFunction();
        this.addNodeColorWarning();
        this.addColorPaletteSettingForNodes();

        this.addInvertNodeStats();

        this.addLinkSizeFunction();
        this.addLinkColorFunction();
        this.addColorPaletteSettingForLinks();
    }

    private addNodeSizeProperties(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.nodeSizeProperties"))
            .setDesc(t("features.nodeSizePropertiesDesc"))
            .addExtraButton(cb => {
                cb.setIcon('mouse-pointer-click');
                cb.onClick(() => {
                    const modal = new SettingMultiPropertiesModal(
                        t("features.nodeSizeProperties"),
                        t("features.nodeSizePropertiesAdd"),
                        PluginInstances.settings.nodesSizeProperties
                    );
                    modal.open();
                })
            });

        this.elementsBody.push(setting.settingEl);
    }

    private addNodeSizeFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.nodeSizesFunction"))
            .setDesc(t("features.nodeSizesFunctionDesc"))
            .addDropdown(cb => {
                cb.addOptions(nodeStatFunctionLabels);
                cb.setValue(PluginInstances.settings.nodesSizeFunction);
                cb.onChange((value) => {
                    this.recomputeNodesSizes(value as NodeStatFunction, PluginInstances.settings.invertNodeStats);
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
        this.setWarning(setting, PluginInstances.graphsManager?.nodesSizeCalculator?.getWarning());
    }

    private addNodeColorFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.nodeColorsFunction"))
            .setDesc(t("features.nodeColorsFunctionDesc"))
            .addDropdown(cb => {
                cb.addOptions(nodeStatFunctionLabels);
                cb.setValue(PluginInstances.settings.nodesColorFunction);
                cb.onChange((value) => {
                    this.recomputeNodeColors(value as NodeStatFunction, PluginInstances.settings.invertNodeStats);
                });
            });

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
        this.setWarning(setting, PluginInstances.graphsManager?.nodesColorCalculator?.getWarning());
    }

    private addInvertNodeStats(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.nodeStatsInvert"))
            .setDesc(t("features.nodeStatsInvertDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.invertNodeStats);
                cb.onChange((value) => {
                    this.recomputeNodesSizes(PluginInstances.settings.nodesSizeFunction, value);
                    this.recomputeNodeColors(PluginInstances.settings.nodesColorFunction, value);
                });
            });

        this.elementsBody.push(setting.settingEl);
    }

    private addColorPaletteSettingForNodes(): void {
        this.nodesPaletteSetting = new SettingColorPalette(this.containerEl, this.settingTab, 'stats-colors-nodes')
            .setDesc(t("features.nodeColorsPaletteDesc"));

        this.nodesPaletteSetting.setValue(PluginInstances.settings.nodesColorColormap);

        this.nodesPaletteSetting.onPaletteChange((palette: string) => {
            PluginInstances.settings.nodesColorColormap = palette;
            PluginInstances.plugin.saveSettings();
            PluginInstances.graphsManager.nodesColorCalculator?.mapStat();
            PluginInstances.graphsManager.updatePaletteForNodesStat();
        });

        // Push to body list
        this.elementsBody.push(this.nodesPaletteSetting.settingEl);
    }

    private addLinkSizeFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.linkSizesFunction"))
            .setDesc(t("features.linkSizesFunctionDesc"))
            .addDropdown(cb => {
                this.linksSizeFunctionDropdown = cb;
                const ga = getGraphAnalysis();
                cb.addOptions(
                    Object.fromEntries(Object.entries(linkStatFunctionLabels)
                        .filter(entry => {
                            const fn = entry[0] as LinkStatFunction;
                            if (linkStatFunctionNeedsGraphAnalysis[fn] && !ga["graph-analysis"])
                                return false;
                            if (linkStatFunctionNeedsNLP[fn] && !ga.nlp)
                                return false;
                            return true;
                        })
                    )
                );
                cb.setValue(PluginInstances.settings.linksSizeFunction);
                cb.onChange((value) => {
                    this.recomputeLinksSizes(value as LinkStatFunction);
                });
            });

        this.elementsBody.push(setting.settingEl);
    }

    private addLinkColorFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.linkColorsFunction"))
            .setDesc(t("features.linkColorsFunctionDesc") + " ⚠️ " + t("features.linksFeatureRequired"))
            .addDropdown(cb => {
                this.linksColorFunctionDropdown = cb;
                const ga = getGraphAnalysis();
                cb.addOptions(
                    Object.fromEntries(Object.entries(linkStatFunctionLabels)
                        .filter(entry => {
                            const fn = entry[0] as LinkStatFunction;
                            if (linkStatFunctionNeedsGraphAnalysis[fn] && !ga["graph-analysis"])
                                return false;
                            if (linkStatFunctionNeedsNLP[fn] && !ga.nlp)
                                return false;
                            return true;
                        })
                    )
                );
                cb.setValue(PluginInstances.settings.linksColorFunction);
                cb.onChange((value) => {
                    this.recomputeLinksColors(value as LinkStatFunction);
                });
            });

        this.elementsBody.push(setting.settingEl);
    }

    private addColorPaletteSettingForLinks(): void {
        this.linksPaletteSetting = new SettingColorPalette(this.containerEl, this.settingTab, 'stats-colors-links')
            .setDesc(t("features.linkColorsPaletteDesc"));

        this.linksPaletteSetting.setValue(PluginInstances.settings.linksColorColormap);

        this.linksPaletteSetting.onPaletteChange((palette: string) => {
            PluginInstances.settings.linksColorColormap = palette;
            PluginInstances.plugin.saveSettings();
            PluginInstances.graphsManager.linksColorCalculator?.mapStat();
            PluginInstances.graphsManager.updatePaletteForLinksStat();
        });

        // Push to body list
        this.elementsBody.push(this.linksPaletteSetting.settingEl);
    }

    onCustomPaletteModified(oldName: string, newName: string): void {
        // Check if the colormap is no longer in the settings
        if (!getCMapData(PluginInstances.settings.nodesColorColormap, PluginInstances.settings)) {
            // If the old name matches AND the new name is valid, change the name
            if (PluginInstances.settings.nodesColorColormap === oldName && getCMapData(newName, PluginInstances.settings)) {
                PluginInstances.settings.nodesColorColormap = newName;
            }
            // Otherwise, reset it
            else {
                PluginInstances.settings.nodesColorColormap = "rainbow";
            }
        }
        this.nodesPaletteSetting.populateCustomOptions();
        this.nodesPaletteSetting.setValue(PluginInstances.settings.nodesColorColormap);

        // Check if the colormap is no longer in the settings
        if (!getCMapData(PluginInstances.settings.linksColorColormap, PluginInstances.settings)) {
            // If the old name matches AND the new name is valid, change the name
            if (PluginInstances.settings.linksColorColormap === oldName && getCMapData(newName, PluginInstances.settings)) {
                PluginInstances.settings.linksColorColormap = newName;
            }
            // Otherwise, reset it
            else {
                PluginInstances.settings.linksColorColormap = "rainbow";
            }
        }
        this.linksPaletteSetting.populateCustomOptions();
        this.linksPaletteSetting.setValue(PluginInstances.settings.linksColorColormap);
    }








    private setWarning(warningSetting: Setting, warning?: string): void {
        if (warning && warning !== "") {
            warningSetting.setDesc(warning);
            warningSetting.settingEl.removeClass("is-hidden");
        }
        else {
            warningSetting.setDesc("");
            warningSetting.settingEl.addClass("is-hidden");
        }
    }

    private recomputeNodesSizes(functionKey: NodeStatFunction, invertNodeStats: boolean): void {
        PluginInstances.settings.nodesSizeFunction = functionKey;
        PluginInstances.settings.invertNodeStats = invertNodeStats;
        PluginInstances.plugin.saveSettings();

        PluginInstances.graphsManager.nodesSizeCalculator = NodeStatCalculatorFactory.getCalculator('size');
        PluginInstances.graphsManager.nodesSizeCalculator?.computeStats(invertNodeStats).then(() => {
            PluginInstances.graphsManager.updateSizeFunctionForNodesStat();
        });
        this.setWarning(this.warningNodeSizeSetting, PluginInstances.graphsManager?.nodesSizeCalculator?.getWarning());
    }

    private recomputeNodeColors(functionKey: NodeStatFunction, invertNodeStats: boolean): void {
        PluginInstances.settings.nodesColorFunction = functionKey;
        PluginInstances.settings.invertNodeStats = invertNodeStats;
        PluginInstances.graphsManager.nodesColorCalculator = NodeStatCalculatorFactory.getCalculator('color');
        PluginInstances.graphsManager.nodesColorCalculator?.computeStats(invertNodeStats).then(() => {
            PluginInstances.graphsManager.updatePaletteForNodesStat();
        });
        this.setWarning(this.warningNodeColorSetting, PluginInstances.graphsManager?.nodesColorCalculator?.getWarning());
        PluginInstances.plugin.saveSettings();
    }

    private recomputeLinksSizes(functionKey: LinkStatFunction): void {
        const ga = getGraphAnalysis();
        if (!ga && linkStatFunctionNeedsGraphAnalysis[functionKey]) {
            return;
        }
        else if (!ga.nlp && linkStatFunctionNeedsNLP[functionKey]) {
            new Notice(`${t("notices.nlpPluginRequired")} (${functionKey})`);
            functionKey = 'default';
            this.linksSizeFunctionDropdown?.setValue(functionKey);
        }

        PluginInstances.settings.linksSizeFunction = functionKey;
        PluginInstances.plugin.saveSettings();

        if (functionKey === 'default') {
            PluginInstances.graphsManager.linksSizeCalculator = undefined;
            PluginInstances.graphsManager.updateSizeFunctionForLinksStat();
            return;
        }

        PluginInstances.graphsManager.linksSizeCalculator = LinksStatCalculatorFactory.getCalculator('size');
        PluginInstances.graphsManager.linksSizeCalculator?.computeStats(PluginInstances.settings.linksSizeFunction).then(() => {
            PluginInstances.graphsManager.updateSizeFunctionForLinksStat();
        });
    }

    private recomputeLinksColors(functionKey: LinkStatFunction): void {
        const ga = getGraphAnalysis();
        if (!ga && linkStatFunctionNeedsGraphAnalysis[functionKey]) {
            return;
        }
        else if (!ga.nlp && linkStatFunctionNeedsNLP[functionKey]) {
            new Notice(`${t("notices.nlpPluginRequired")} (${functionKey})`);
            functionKey = 'default';
            this.linksColorFunctionDropdown?.setValue(functionKey);
        }

        PluginInstances.settings.linksColorFunction = functionKey;
        PluginInstances.plugin.saveSettings();

        if (functionKey === 'default') {
            PluginInstances.graphsManager.linksColorCalculator = undefined;
            PluginInstances.graphsManager.updatePaletteForLinksStat();
            return;
        }

        PluginInstances.graphsManager.linksColorCalculator = LinksStatCalculatorFactory.getCalculator('color');
        PluginInstances.graphsManager.linksColorCalculator?.computeStats(PluginInstances.settings.linksColorFunction).then(() => {
            PluginInstances.graphsManager.updatePaletteForLinksStat();
        });
    }
}