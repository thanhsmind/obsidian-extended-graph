import { Setting } from "obsidian";
import { NodesQueryModal, PinShapeData, PinShapeLabels, PinShapeType, PluginInstances, QueryData, RuleQuery } from "src/internal";
import STRINGS from "src/Strings";

export class PinMultipleNodesModal extends NodesQueryModal {
    pinCallback: (shapeData: PinShapeData, queryData: QueryData) => void;
    shapeData: PinShapeData;
    gridSetting: Setting | null;

    constructor(pinCallback: (shapeData: PinShapeData, queryData: QueryData) => void) {
        super(STRINGS.features.pinMultipleNodes,
            PluginInstances.settings.multipleNodesData.queryData ?? {combinationLogic: 'AND', rules: []},
            (queryData) => { this.pinCallback(this.shapeData, queryData); }
        );
        this.pinCallback = pinCallback;
        this.shapeData = PluginInstances.settings.multipleNodesData.shapeData ?? {
            type: 'grid',
            center: {x: 0, y: 0},
            step: 100
        };
    }

    override onOpen() {
        super.onOpen();
        this.addShapeType();
        this.addStep();
        this.addCenter();
        this.changeType(this.shapeData.type);
        this.applyButton
            .setButtonText(STRINGS.controls.apply)
            .setIcon('check');

        if (this.rulesSettings.length === 0) {
            this.addRule({source: 'all'});
            this.onChange();
        }
    }

    private addShapeType() {
        new Setting(this.contentEl)
            .setName(STRINGS.features.pinMultipleShape)
            .addDropdown(cb => {
                cb.addOptions(PinShapeLabels);
                cb.setValue(this.shapeData.type);
                cb.onChange((value) => {
                    this.changeType(value as PinShapeType);
                    this.saveSettings();
                });
            });
    }

    private addStep() {
        new Setting(this.contentEl)
            .setName(STRINGS.features.pinMultipleGap)
            .addText(cb => {
                cb.setValue(this.shapeData.step.toString());
                cb.onChange((value) => {
                    const intValue = parseInt(value);
                    if (!isNaN(intValue)) {
                        this.shapeData.step = intValue;
                        this.saveSettings();
                    }
                })
            });
    }

    private addCenter() {
        new Setting(this.contentEl)
            .setName(STRINGS.features.pinMultipleCenter)
            .addText(cb => {
                cb.inputEl.insertAdjacentText('beforebegin', "X");
                cb.setValue(this.shapeData.center.x.toString());
                cb.onChange((value) => {
                    const intValue = parseInt(value);
                    if (!isNaN(intValue)) {
                        this.shapeData.center.x = intValue;
                        this.saveSettings();
                    }
                })
            })
            .addText(cb => {
                cb.inputEl.insertAdjacentText('beforebegin', "Y");
                cb.setValue(this.shapeData.center.y.toString());
                cb.onChange((value) => {
                    const intValue = parseInt(value);
                    if (!isNaN(intValue)) {
                        this.shapeData.center.y = intValue;
                        this.saveSettings();
                    }
                })
            });
    }

    private addGridSettings() {
        if (this.gridSetting) return;
        // grid size
        this.gridSetting = new Setting(this.contentEl)
            .setName(STRINGS.features.pinMultipleGridSize)
            .setDesc(STRINGS.features.pinMultipleGridSizeDesc)
            .addText(cb => {
                cb.setValue(this.shapeData.columns?.toString() ?? '');
                cb.onChange((value) => {
                    if (value === '') {
                        this.shapeData.columns = undefined;
                        this.saveSettings();
                    }
                    else if (value === 'N' || value === 'auto') {
                        this.shapeData.columns = value;
                        this.saveSettings();
                    }
                    else {
                        const intValue = parseInt(value);
                        if (!isNaN(intValue) && intValue >= 1) {
                            this.shapeData.columns = intValue;
                            this.saveSettings();
                        }
                    }
                })
            });
    }

    private removeGridSettings() {
        if (!this.gridSetting) return;

        this.gridSetting.settingEl.parentNode?.removeChild(this.gridSetting.settingEl);
        this.gridSetting = null;
    }

    private changeType(type: PinShapeType) {
        this.shapeData.type = type;
        this.shapeData.type === 'grid' ? this.addGridSettings() : this.removeGridSettings();
        this.saveSettings();
    }

    override onChange(ruleQuery?: RuleQuery): void {
        super.onChange(ruleQuery);
        this.saveSettings();
    }

    private saveSettings() {
        PluginInstances.settings.multipleNodesData = {
            shapeData: this.shapeData,
            queryData: this.queryData
        }
        PluginInstances.plugin.saveSettings();
    }
}


