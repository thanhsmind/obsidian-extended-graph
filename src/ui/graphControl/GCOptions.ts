import { setIcon, Setting } from "obsidian";
import { GraphPlugin, GraphView, LocalGraphView } from "obsidian-typings";
import {
    GCSection,
    getEngine,
    GraphStateModal,
    ImportConfigModal,
    RendererNodeNamesSuggester,
    PinMultipleNodesModal,
    Pinner,
    PluginInstances,
    t
} from "src/internal";

export class GCOptions extends GCSection {
    suggester: RendererNodeNamesSuggester;

    constructor(view: GraphView | LocalGraphView) {
        super(view, "options", t("plugin.options"));

        this.treeItemChildren = this.root.createDiv("tree-item-children");
        this.display(true);

        this.collapseGraphControlSection();
    }

    // ================================ DISPLAY ================================

    override display(enable: boolean) {
        this.treeItemChildren.replaceChildren();

        if (enable) this.createImportConfig();
        this.createSaveForDefaultState();
        if (enable) this.createSaveForNormalState();
        this.createZoomOnNode();
        this.createScreenshot();
        if (enable) this.createButtonViewState();
        if (enable) this.createPinMultipleNodes();
        if (enable) this.createUnpinAllNodes();
    }

    private createImportConfig(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(t("controls.importSettingsAndReload"))
            .addExtraButton(cb => {
                cb.setIcon("settings");
                cb.setTooltip(t("controls.importSettings"));
                cb.onClick(() => {
                    const modal = new ImportConfigModal((filepath: string) => {
                        if (filepath.trim() === "") {
                            return;
                        }
                        PluginInstances.plugin.importSettings(filepath).then(() => {
                            PluginInstances.graphsManager.resetPlugin(this.view);
                        });
                    });
                    modal.open();
                });
            });
    }

    private createSaveForDefaultState(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(t("states.saveForDefaultState"))
            .setTooltip(t("states.saveForDefaultStateDesc"))
            .addExtraButton(cb => {
                cb.extraSettingsEl.addClass("save-button");
                setIcon(cb.extraSettingsEl, "arrow-up-to-line");
                cb.onClick(() => {
                    PluginInstances.statesManager.saveForDefaultState(this.view);
                });
            });
    }

    private createSaveForNormalState(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(t("states.saveForNormalState"))
            .setDesc(t("states.saveForNormalStateDesc"))
            .setTooltip(t("states.saveForNormalStateTooltip"))
            .addExtraButton(cb => {
                cb.extraSettingsEl.addClass("save-button");
                setIcon(cb.extraSettingsEl, "arrow-down-to-line");
                cb.onClick(() => {
                    this.saveForNormalState();
                });
            });
    }

    private createScreenshot(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(t("features.svgScreenshotCopy"))
            .addExtraButton(cb => {
                cb.extraSettingsEl.addClass("screenshot-button");
                setIcon(cb.extraSettingsEl, "image");
                cb.onClick(() => {
                    this.getSVGScreenshot();
                });
            });
    }

    private createZoomOnNode(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(t("features.zoomOnNode"))
            .addSearch(cb => {
                const callback = (value: string) => {
                    PluginInstances.graphsManager.zoomOnNode(this.view, value);
                }
                this.suggester = new RendererNodeNamesSuggester(cb.inputEl, this.view.renderer, callback);
            });
    }

    private createButtonViewState(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(t("states.showGraphState"))
            .addExtraButton(cb => {
                cb.setIcon("info");
                cb.onClick(() => {
                    const instances = PluginInstances.graphsManager.allInstances.get(this.view.leaf.id);
                    if (!instances) return;
                    const modal = new GraphStateModal(instances);
                    modal.open();
                })
            })
    }

    private createPinMultipleNodes(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(t("features.pinMultipleNodes"))
            .addExtraButton(cb => {
                cb.setIcon('pin');
                cb.onClick(() => {
                    const instances = PluginInstances.graphsManager.allInstances.get(this.view.leaf.id);
                    if (!instances) return;
                    const pinner = new Pinner(instances);
                    const modal = new PinMultipleNodesModal((shapeData, queryData) => {
                        pinner.pinInShape(shapeData, queryData);
                    });
                    modal.open();
                })
            });
    }

    private createUnpinAllNodes(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(t("features.unpinAllNodes"))
            .addExtraButton(cb => {
                cb.setIcon('pin-off');
                cb.onClick(() => {
                    const instances = PluginInstances.graphsManager.allInstances.get(this.view.leaf.id);
                    if (!instances) return;
                    const pinner = new Pinner(instances);
                    pinner.unpinAllNodes();
                })
            });
    }

    // =============================== CALLBACKS ===============================

    private saveForNormalState() {
        const instance = (PluginInstances.app.internalPlugins.getPluginById("graph") as GraphPlugin).instance;

        const engine = getEngine(this.view);
        if (!engine) {
            return;
        }
        instance.options = engine.getOptions();
        instance.saveOptions();
        PluginInstances.graphsManager.backupOptions(this.view);
        new Notice(t("notices.normalStateSave"));
    }

    private getSVGScreenshot() {
        PluginInstances.graphsManager.getSVGScreenshot(this.view);
    }
}