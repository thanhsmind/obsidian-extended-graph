import { Setting } from "obsidian";
import { GraphsManager } from "src/graphsManager";
import { WorkspaceLeafExt } from "src/types/leaf";
import { GCSection } from "./GCSection";
import { InteractiveManager } from "src/graph/interactiveManager";
import { GraphEventsDispatcher } from "src/graph/graphEventsDispatcher";

export class GCFolders extends GCSection {
    foldersManager: InteractiveManager | undefined;
    
    constructor(leaf: WorkspaceLeafExt, graphsManager: GraphsManager, foldersManager: InteractiveManager) {
        super(leaf, graphsManager, "folders");

        this.foldersManager = foldersManager;

        this.treeItemChildren = this.root.createDiv("tree-item-children");
        this.onlyWhenPluginEnabled.push(this.root);

        this.collapseGraphControlSection();
    }
    
    onPluginEnabled(dispatcher: GraphEventsDispatcher): void {
        //this.createFolders();
    }

    createFolders(): void {
        const paths = this.foldersManager?.getTypesWithoutNone();
        if (!paths) return;
        for (const path of paths) {
            this.addFolder(path).settingEl;
        }
    }

    addFolder(path: string): Setting {
        const setting = new Setting(this.treeItemChildren)
            .setName(path)
            .addToggle(cb => {
                cb.onChange(enable => {
                    this.toggleFolder(path, enable);
                })
            });
        const color = this.foldersManager?.getColor(path);
        if (color) setting.settingEl.style.setProperty("--folder-color-rgb", `${color[0]}, ${color[1]}, ${color[2]}`);
        return setting;
    }

    toggleFolder(path: string, enable: boolean) {
        if (enable) this.foldersManager?.enable([path]);
        else this.foldersManager?.disable([path]);
    }
}