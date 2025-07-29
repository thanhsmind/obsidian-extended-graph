import { ExtraButtonComponent, Setting } from "obsidian";
import { ExtendedGraphSettingTab, NodeShape, PluginInstances, QueryData, QueryMatcher, SettingsSectionPerGraphType, ShapeEnum, ShapeQueryModal, t } from "src/internal";

export class SettingShapes extends SettingsSectionPerGraphType {
    settingsShape: SettingShape[] = [];

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'shapes', '', t("features.ids.shapes"), t("features.shapes"), 'shapes', t("features.shapesDesc"))
    }

    protected override addBody() {
        const shapeQueries: { [k: string]: QueryData } = Object.fromEntries(Object.entries(PluginInstances.settings.shapeQueries).sort((a: [string, QueryData], b: [string, QueryData]) => {
            return (a[1].index ?? 0) - (b[1].index ?? 0);
        }));
        const values = Object.keys(shapeQueries);
        for (const shape of values) {
            const shapeSetting = this.addShape(shape as ShapeEnum);
            this.elementsBody.push(shapeSetting.settingEl);
            this.settingsShape.push(shapeSetting);
        }
    }

    private addShape(shape: ShapeEnum): SettingShape {
        return new SettingShape(this.settingTab.containerEl, shape, this.moveDown.bind(this), this.moveUp.bind(this));
    }

    private moveDown(settingShape: SettingShape) {
        const index = this.settingsShape.indexOf(settingShape);
        if (index >= this.settingsShape.length - 1) return;
        [this.settingsShape[index], this.settingsShape[index + 1]] = [this.settingsShape[index + 1], this.settingsShape[index]];

        const next = settingShape.settingEl.nextSibling;
        this.settingTab.containerEl?.insertAfter(settingShape.settingEl, next);

        PluginInstances.settings.shapeQueries[settingShape.shape].index = index + 1;
        PluginInstances.settings.shapeQueries[this.settingsShape[index].shape].index = index;
        PluginInstances.plugin.saveSettings();
    }

    private moveUp(settingShape: SettingShape) {
        const index = this.settingsShape.indexOf(settingShape);
        if (index === 0) return;
        [this.settingsShape[index], this.settingsShape[index - 1]] = [this.settingsShape[index - 1], this.settingsShape[index]];

        const previous = settingShape.settingEl.previousSibling;
        this.settingTab.containerEl?.insertBefore(settingShape.settingEl, previous);

        PluginInstances.settings.shapeQueries[settingShape.shape].index = index - 1;
        PluginInstances.settings.shapeQueries[this.settingsShape[index].shape].index = index;
        PluginInstances.plugin.saveSettings();
    }
}

class SettingShape extends Setting {
    shape: ShapeEnum;
    queryStringDiv: HTMLDivElement;

    moveDown: (settingShape: SettingShape) => void;
    moveUp: (settingShape: SettingShape) => void;

    constructor(containerEl: HTMLElement, shape: ShapeEnum, moveDown: (settingShape: SettingShape) => void, moveUp: (settingShape: SettingShape) => void) {
        super(containerEl);

        this.shape = shape;

        this.moveDown = moveDown;
        this.moveUp = moveUp;

        this.setName(t(`features.shapesNames.${shape}`))
            .addMoveButtons()
            .addQueryStringDiv()
            .addSVG()
            .addEditButton();
    }

    private addQueryStringDiv(): SettingShape {
        this.queryStringDiv = this.controlEl.createDiv({ cls: "query-string" });
        this.setQueryText(this.shape, PluginInstances.settings.shapeQueries[this.shape]);
        return this;
    }

    private addSVG(): SettingShape {
        const svg = NodeShape.getSVG(this.shape);
        svg.addClass("shape-svg");
        this.controlEl.appendChild(svg);
        return this;
    }

    private addEditButton(): SettingShape {
        this.addExtraButton(cb => {
            cb.setTooltip(t("query.editShapeQuery"));
            cb.onClick(() => {
                const modal = new ShapeQueryModal(
                    this.shape,
                    PluginInstances.settings.shapeQueries[this.shape],
                    this.saveShapeQuery.bind(this)
                );
                modal.open();
            })
        });
        return this;
    }

    private addMoveButtons(): SettingShape {
        const container = this.settingEl.createDiv({ cls: 'move-buttons' });

        new ExtraButtonComponent(container)
            .setIcon('chevron-up')
            .setTooltip(t("controls.moveUp"))
            .onClick(() => {
                this.moveUp(this)
            });

        new ExtraButtonComponent(container)
            .setIcon('chevron-down')
            .setTooltip(t("controls.moveDown"))
            .onClick(() => {
                this.moveDown(this)
            });

        this.settingEl.insertAdjacentElement('afterbegin', container);

        return this;
    }

    private setQueryText(shape: ShapeEnum, queryData: QueryData) {
        this.queryStringDiv.setText(new QueryMatcher(queryData).toString())
    }

    private saveShapeQuery(shape: ShapeEnum, queryData: QueryData) {
        this.setQueryText(shape, queryData);
        PluginInstances.settings.shapeQueries[shape].combinationLogic = queryData.combinationLogic;
        PluginInstances.settings.shapeQueries[shape].rules = queryData.rules;
        PluginInstances.plugin.saveSettings();
    }
}