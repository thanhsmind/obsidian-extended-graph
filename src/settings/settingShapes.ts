import { ExtraButtonComponent, Setting } from "obsidian";
import { ExtendedGraphSettingTab, NodeShape, QueryData, QueryMatcher, SettingsSectionCollapsible, ShapeEnum, ShapeQueryModal } from "src/internal";
import ExtendedGraphPlugin from "src/main";

export class SettingShapes extends SettingsSectionCollapsible {
    settingsShape: SettingShape[] = [];

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'shapes', '', "Shapes", 'shapes', "Use nodes of various shapes")
    }

    protected override addBody() {
        const shapeQueries: {[k: string]: QueryData} = Object.fromEntries(Object.entries(this.settingTab.plugin.settings.shapeQueries).sort((a: [string, QueryData], b: [string, QueryData]) => {
            return a[1].index - b[1].index;
        }));
        const values = Object.keys(shapeQueries);
        for (const shape of values) {
            const shapeSetting = this.addShape(shape as ShapeEnum);
            this.elementsBody.push(shapeSetting.settingEl);
            this.settingsShape.push(shapeSetting);
        }
    }

    private addShape(shape: ShapeEnum): SettingShape {
        return new SettingShape(this.settingTab.containerEl, this.settingTab.plugin, shape, this.moveDown.bind(this), this.moveUp.bind(this));
    }

    private moveDown(settingShape: SettingShape) {
        const index = this.settingsShape.indexOf(settingShape);
        if (index >= this.settingsShape.length - 1) return;
        [this.settingsShape[index], this.settingsShape[index + 1]] = [this.settingsShape[index + 1], this.settingsShape[index]];
        
        const next = settingShape.settingEl.nextSibling;
        this.settingTab.containerEl?.insertAfter(settingShape.settingEl, next);

        this.settingTab.plugin.settings.shapeQueries[settingShape.shape].index = index + 1;
        this.settingTab.plugin.settings.shapeQueries[this.settingsShape[index].shape].index = index;
        this.settingTab.plugin.saveSettings();
    }

    private moveUp(settingShape: SettingShape) {
        const index = this.settingsShape.indexOf(settingShape);
        if (index === 0) return;
        [this.settingsShape[index], this.settingsShape[index - 1]] = [this.settingsShape[index - 1], this.settingsShape[index]];

        const previous = settingShape.settingEl.previousSibling;
        this.settingTab.containerEl?.insertBefore(settingShape.settingEl, previous);

        this.settingTab.plugin.settings.shapeQueries[settingShape.shape].index = index - 1;
        this.settingTab.plugin.settings.shapeQueries[this.settingsShape[index].shape].index = index;
        this.settingTab.plugin.saveSettings();
    }
}

class SettingShape extends Setting {
    shape: ShapeEnum;
    plugin: ExtendedGraphPlugin;
    queryStringDiv: HTMLDivElement;

    moveDown: (settingShape: SettingShape) => void;
    moveUp: (settingShape: SettingShape) => void;

    constructor(containerEl: HTMLElement, plugin: ExtendedGraphPlugin, shape: ShapeEnum, moveDown: (settingShape: SettingShape) => void, moveUp: (settingShape: SettingShape) => void) {
        super(containerEl);

        this.shape = shape;
        this.plugin = plugin;

        this.moveDown = moveDown;
        this.moveUp = moveUp;

        this.setName(shape)
            .addMoveButtons()
            .addQueryStringDiv()
            .addSVG()
            .addEditButton();
    }

    private addQueryStringDiv(): SettingShape {
        this.queryStringDiv = this.controlEl.createDiv({ cls: "query-string" });
        this.setQueryText(this.shape, this.plugin.settings.shapeQueries[this.shape]);
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
            cb.setTooltip("Edit shape query");
            cb.onClick(() => {
                const modal = new ShapeQueryModal(
                    this.plugin.app,
                    this.shape,
                    this.plugin.settings.shapeQueries[this.shape],
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
			.setTooltip('Move up')
            .onClick(() => {
                this.moveUp(this)
            });

        new ExtraButtonComponent(container)
            .setIcon('chevron-down')
			.setTooltip('Move down')
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
        this.plugin.settings.shapeQueries[shape].combinationLogic = queryData.combinationLogic;
        this.plugin.settings.shapeQueries[shape].rules = queryData.rules;
        this.plugin.saveSettings();
    }
}