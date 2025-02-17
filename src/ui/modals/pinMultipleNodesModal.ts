import { Setting } from "obsidian";
import { NodesQueryModal, PinShapeData, PinShapeLabels, PinShapeType, QueryData } from "src/internal";
import STRINGS from "src/Strings";

export class PinMultipleNodesModal extends NodesQueryModal {
    pinCallback: (shapeData: PinShapeData, queryData: QueryData) => void;
    shapeData: PinShapeData;
    gridSetting: Setting | null;

    constructor(pinCallback: (shapeData: PinShapeData, queryData: QueryData) => void) {
        super(STRINGS.features.pinMultipleNodes,
            {combinationLogic: 'AND', rules: []},
            (queryData) => { this.pinCallback(this.shapeData, queryData); }
        );
        this.pinCallback = pinCallback;
        this.shapeData = {
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

        this.addRule({source: 'all'});
        this.onChange();
    }

    private addShapeType() {
        new Setting(this.contentEl)
            .setName(STRINGS.features.pinMultipleShape)
            .addDropdown(cb => {
                cb.addOptions(PinShapeLabels);
                cb.setValue(this.shapeData.type);
                cb.onChange((value) => {
                    this.changeType(value as PinShapeType);
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
                    }
                })
            });
    }

    private addGridSettings() {
        if (this.gridSetting) return;
        // grid size
        new Setting(this.contentEl)
            .setName(STRINGS.features.pinMultipleGridSize)
            .setDesc(STRINGS.features.pinMultipleGridSizeDesc)
            .addText(cb => {
                cb.setValue(this.shapeData.columns?.toString() ?? '');
                cb.onChange((value) => {
                    if (value === '') {
                        this.shapeData.columns = undefined;
                    }
                    else if (value === 'N' || value === 'auto') {
                        this.shapeData.columns = value;
                    }
                    else {
                        const intValue = parseInt(value);
                        if (!isNaN(intValue) && intValue >= 1) {
                            this.shapeData.columns = intValue;
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
    }
}


