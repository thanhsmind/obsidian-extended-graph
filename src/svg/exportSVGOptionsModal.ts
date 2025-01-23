import { App, Modal, Setting } from "obsidian";
import { Graph } from "src/graph/graph";
import { ExtendedGraphSettings } from "src/settings/settings";

export type ExportSVGOptions = {
    asImage: boolean,
    // Core options
    onlyVisibleArea: boolean,
    showNodeNames: boolean,
    // Extended options
    useCurvedLinks: boolean,
    useNodesShapes: boolean,
    showArcs: boolean,
}

export class ExportSVGOptionModal extends Modal {
    graph?: Graph;
    settings?: ExtendedGraphSettings;
    isCanceled: boolean = true;

    options: ExportSVGOptions = {
        asImage: true,
        // Core options
        onlyVisibleArea: false,
        showNodeNames: true,
        // Extended options
        useCurvedLinks: false,
        useNodesShapes: false,
        showArcs: false,
    };

    constructor(app: App, graph?: Graph) {
        super(app);
        this.graph = graph;
        this.settings = graph?.staticSettings;

        this.setTitle("SVG Export options");
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
            .setName("Export only visible area")
            .addToggle(cb => {
                cb.setValue(this.options.onlyVisibleArea);
                cb.onChange(value => {
                    this.options.onlyVisibleArea = value;
                })
            });
    }

    private addShowNodeNames() {
        new Setting(this.contentEl)
            .setName("Show node names")
            .addToggle(cb => {
                cb.setValue(this.options.showNodeNames);
                cb.onChange(value => {
                    this.options.showNodeNames = value;
                })
            });
    }

    // =========================== EXTENDED OPTIONS ============================

    private addExtendedOptions() {
        if (!this.graph) return;

        this.addUseCurvedLinks();
        this.addUseNodeShapes();
        this.addShowArcs();
    }

    private addUseCurvedLinks() {
        const canUseCurvedLinks = this.canUseCurvedLinks();
        this.options.useCurvedLinks = canUseCurvedLinks;
        if (!canUseCurvedLinks) return;

        new Setting(this.contentEl)
            .setName("Use curved links")
            .addToggle(cb => {
                cb.setValue(this.options.useCurvedLinks);
                cb.onChange(value => {
                    this.options.useCurvedLinks = value;
                })
            });
    }

    private canUseCurvedLinks() {
        if (!this.settings) return false;
        return this.settings.enableFeatures['links'] && this.settings.enableFeatures['curvedLinks'];
    }

    private addUseNodeShapes() {
        const canUseNodeShapes = this.canUseNodeShapes();
        this.options.useNodesShapes = canUseNodeShapes;
        if (!canUseNodeShapes) return;

        new Setting(this.contentEl)
            .setName("Use nodes shapes")
            .addToggle(cb => {
                cb.setValue(this.options.useNodesShapes);
                cb.onChange(value => {
                    this.options.useNodesShapes = value;
                })
            });
    }

    private canUseNodeShapes(): boolean {
        if (!this.settings) return false;
        return this.settings.enableFeatures['shapes'] ?? false
    }

    private addShowArcs() {
        const canShowArcs = this.canShowArcs();
        this.options.showArcs = canShowArcs;
        if (!canShowArcs) return;

        new Setting(this.contentEl)
            .setName("Show arcs (tags and/or types)")
            .addToggle(cb => {
                cb.setValue(this.options.showArcs);
                cb.onChange(value => {
                    this.options.showArcs = value;
                })
            });
    }

    private canShowArcs(): boolean {
        if (!this.settings) return false;
        if (this.settings.enableFeatures['tags']) return true;
        if (!this.settings.enableFeatures['properties']) return false;
        return Object.values(this.settings.additionalProperties).some(b => b);
    }

    // ============================ APPLY AND CLOSE ============================

    private addApply() {
        const setting = new Setting(this.contentEl)
            .addButton(cb => {
                cb.setButtonText("Copy svg code to clipboard");
                cb.onClick(() => {
                    this.isCanceled = false;
                    this.options.asImage = false;
                    this.close();
                })
            });
            
        if (ClipboardItem.supports("image/svg+xml")) {
            setting.addButton(cb => {
                cb.setButtonText("Copy screenshot to clipboard");
                cb.setCta();
                cb.onClick(() => {
                    this.isCanceled = false;
                    this.options.asImage = true;
                    this.close();
                })
            })
        }
    }
}

