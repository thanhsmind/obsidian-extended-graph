import { Modal, Setting } from "obsidian";
import { ExtendedGraphSettings, Graph, PluginInstances } from "src/internal";
import STRINGS from "src/Strings";

export class ExportSVGOptionModal extends Modal {
    graph?: Graph;
    graphSettings?: ExtendedGraphSettings;
    isCanceled: boolean = true;

    constructor(graph?: Graph) {
        super(PluginInstances.app);
        this.graph = graph;
        this.graphSettings = graph?.staticSettings;

        this.setTitle(STRINGS.features.svgScreenshotOptions);
    }

    onOpen() {
        this.addCoreOptions();
        this.addExtendedOptions();
        this.addApply();
    }

    // ============================= CORE OPTIONS ==============================

    private addCoreOptions() {
        this.addOnlyVisibleArea();
        this.addShowNodeNames();
    }

    private addOnlyVisibleArea() {
        new Setting(this.contentEl)
            .setName(STRINGS.features.svgScreenshotVisibleArea)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.exportSVGOptions.onlyVisibleArea);
                cb.onChange(value => {
                    PluginInstances.settings.exportSVGOptions.onlyVisibleArea = value;
                    this.saveSettings();
                })
            });
    }

    private addShowNodeNames() {
        new Setting(this.contentEl)
            .setName(STRINGS.features.svgScreenshotNodeNames)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.exportSVGOptions.showNodeNames);
                cb.onChange(value => {
                    PluginInstances.settings.exportSVGOptions.showNodeNames = value;
                    this.saveSettings();
                })
            });
    }

    // =========================== EXTENDED OPTIONS ============================

    private addExtendedOptions() {
        if (!this.graph) return;

        this.addUseCurvedLinks();
        this.addUseNodeShapes();
        this.addShowArcs();
        this.addShowFolders();
    }

    private addUseCurvedLinks() {
        const canUseCurvedLinks = this.canUseCurvedLinks();
        PluginInstances.settings.exportSVGOptions.useCurvedLinks = canUseCurvedLinks;
        if (!canUseCurvedLinks) return;

        new Setting(this.contentEl)
            .setName(STRINGS.features.svgScreenshotCurvedLinks)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.exportSVGOptions.useCurvedLinks);
                cb.onChange(value => {
                    PluginInstances.settings.exportSVGOptions.useCurvedLinks = value;
                    this.saveSettings();
                })
            });
    }

    private canUseCurvedLinks() {
        if (!this.graphSettings || !this.graph) return false;
        return this.graphSettings.enableFeatures[this.graph.type]['links'] && this.graphSettings.enableFeatures[this.graph.type]['curvedLinks'];
    }

    private addUseNodeShapes() {
        const canUseNodeShapes = this.canUseNodeShapes();
        PluginInstances.settings.exportSVGOptions.useNodesShapes = canUseNodeShapes;
        if (!canUseNodeShapes) return;

        new Setting(this.contentEl)
            .setName(STRINGS.features.svgScreenshotNodeShapes)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.exportSVGOptions.useNodesShapes);
                cb.onChange(value => {
                    PluginInstances.settings.exportSVGOptions.useNodesShapes = value;
                    this.saveSettings();
                })
            });
    }

    private canUseNodeShapes(): boolean {
        if (!this.graphSettings || !this.graph) return false;
        return this.graphSettings.enableFeatures[this.graph.type]['shapes'] ?? false
    }

    private addShowArcs() {
        const canShowArcs = this.canShowArcs();
        PluginInstances.settings.exportSVGOptions.showArcs = canShowArcs;
        if (!canShowArcs) return;

        new Setting(this.contentEl)
            .setName(STRINGS.features.svgScreenshotArcs)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.exportSVGOptions.showArcs);
                cb.onChange(value => {
                    PluginInstances.settings.exportSVGOptions.showArcs = value;
                    this.saveSettings();
                })
            });
    }

    private canShowArcs(): boolean {
        if (!this.graphSettings || !this.graph) return false;
        if (this.graphSettings.enableFeatures[this.graph.type]['tags']) return true;
        if (!this.graphSettings.enableFeatures[this.graph.type]['properties']) return false;
        return Object.values(this.graphSettings.additionalProperties).some(b => b);
    }

    private addShowFolders() {
        const canShowFolders = this.canShowFolders();
        PluginInstances.settings.exportSVGOptions.showFolders = canShowFolders;
        if (!canShowFolders) return;

        new Setting(this.contentEl)
            .setName("Show folder boxes")
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.exportSVGOptions.showFolders);
                cb.onChange(value => {
                    PluginInstances.settings.exportSVGOptions.showFolders = value;
                    this.saveSettings();
                })
            });
    }

    private canShowFolders(): boolean {
        if (!this.graphSettings || !this.graph) return false;
        return this.graphSettings.enableFeatures[this.graph.type]['folders'];
    }

    // ============================ APPLY AND CLOSE ============================

    private addApply() {
        const setting = new Setting(this.contentEl)
            .addButton(cb => {
                cb.setButtonText(STRINGS.features.svgScreenshotCopyCode);
                cb.onClick(() => {
                    this.isCanceled = false;
                    PluginInstances.settings.exportSVGOptions.asImage = false;
                    this.applyAndClose();
                })
            });
            
        // @ts-ignore
        if (ClipboardItem.supports("image/svg+xml")) {
            setting.addButton(cb => {
                cb.setButtonText(STRINGS.features.svgScreenshotCopyImage);
                cb.setCta();
                cb.onClick(() => {
                    this.isCanceled = false;
                    PluginInstances.settings.exportSVGOptions.asImage = true;
                    this.applyAndClose();
                })
            })
        }
    }

    private async saveSettings(): Promise<void> {
        if (this.graphSettings) this.graphSettings.exportSVGOptions = PluginInstances.settings.exportSVGOptions;
        await PluginInstances.plugin.saveSettings();
    }

    private applyAndClose() {
        this.saveSettings().then(() => {
            this.close();
        })
    }
}

