import { Setting, TFile, TFolder } from "obsidian";
import { GraphsManager } from "src/graphsManager";
import { WorkspaceLeafExt } from "src/types/leaf";
import { GCSection } from "./GCSection";

export class GCFolders extends GCSection {
    settingGlobalFilter: Setting;
    
    constructor(leaf: WorkspaceLeafExt, graphsManager: GraphsManager) {
        super(leaf, graphsManager, "folders");

        this.treeItemChildren = this.root.createDiv("tree-item-children");
        this.createFolders();

        this.collapseGraphControlSection();
    }

    createFolders(): void {
        const folders = this.leaf.app.vault.getAllFolders(true);
        for (const folder of folders) {
            const n = folder.children.filter(f => f instanceof TFile).length;
            if (n > 0) {
                this.onlyWhenPluginEnabled.push(this.addFolder(folder).settingEl);
            }
        }
    }

    addFolder(folder: TFolder): Setting {
        const setting = new Setting(this.treeItemChildren)
            .setName(folder.path)
            .addToggle(cb => {
                cb.onChange(enable => {
                    this.toggleFolder(folder.path, enable);
                })
            });
        return setting;
    }

    toggleFolder(path: string, enable: boolean) {
        if (enable) this.graphsManager.dispatchers.get(this.leaf.id)?.addBBox(path);
        else this.graphsManager.dispatchers.get(this.leaf.id)?.removeBBox(path);
    }
}