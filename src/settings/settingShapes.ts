import { Setting } from "obsidian";
import { ExtendedGraphSettingTab } from "./settingTab";
import { addHeading } from "./settingHelperFunctions";
import { NodeShape, ShapeEnum } from "src/graph/graphicElements/nodes/shapes";
import { ShapeQueryModal } from "src/ui/modals/shapeQueryModal";
import { CombinationLogic, QueryData } from "src/queries/queriesMatcher";
import { RuleQuery } from "src/queries/ruleQuery";

export class SettingShapes {
    settingTab: ExtendedGraphSettingTab;
    allTopElements: HTMLElement[] = [];
    queryStringDivs: Record<string, HTMLDivElement> = {};
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        this.settingTab = settingTab;
    }

    display() {
        addHeading({
            containerEl: this.settingTab.containerEl,
            heading: "Shapes",
            icon: 'shapes',
            description: "Use nodes of various shapes",
            displayCSSVariable: '--display-shapes-features',
            enable: this.settingTab.plugin.settings.enableShapes,
            updateToggle: (function (value: boolean) {
                this.settingTab.plugin.settings.enableShapes = value;
            }).bind(this),
            settingTab: this.settingTab
        })

        const values = Object.keys(ShapeEnum);
        for (const enumKey of values) {
            const shapeSetting = this.addShape(ShapeEnum[enumKey as keyof typeof ShapeEnum]);
            this.allTopElements.push(shapeSetting.settingEl);
        }

        this.allTopElements.forEach(el => {
            el.addClass("extended-graph-setting-shapes");
        })
    }

    private addShape(shape: ShapeEnum): Setting {
        const svg = NodeShape.getSVG(shape);
        svg.addClass("shape-svg");
        return new Setting(this.settingTab.containerEl)
            .setName(shape)
            .then(setting => {
                this.queryStringDivs[shape] = setting.controlEl.createDiv({ cls: "query-string" });
                this.setQueryText(shape, this.settingTab.plugin.settings.shapeQueries[shape]);
                setting.controlEl.appendChild(svg);
            })
            .addExtraButton(cb => {
                cb.setTooltip("Edit shape query");
                cb.onClick(() => {
                    const modal = new ShapeQueryModal(
                        this.settingTab.app,
                        shape,
                        this.settingTab.plugin.settings.shapeQueries[shape],
                        this.saveShapeQuery.bind(this)
                    );
                    modal.open();
                })
            });
    }

    private setQueryText(shape: ShapeEnum, queryData: QueryData) {
        let queryDataStr = "";
        for (let i = 0; i < queryData.rules.length; ++i) {
            let ruleStr = new RuleQuery(queryData.rules[i]).toString();
            if (!ruleStr) continue;
            queryDataStr += ruleStr;
            if (i !== queryData.rules.length - 1) queryDataStr += " " + queryData.combinationLogic;
        }
        this.queryStringDivs[shape].setText(queryDataStr)
    }

    private saveShapeQuery(shape: ShapeEnum, queryData: QueryData) {
        this.setQueryText(shape, queryData);
        this.settingTab.plugin.settings.shapeQueries[shape].combinationLogic = queryData.combinationLogic;
        this.settingTab.plugin.settings.shapeQueries[shape].rules = queryData.rules;
        this.settingTab.plugin.saveSettings();
    }
}