import { FOLDER_KEY } from "src/globalVariables";
import { ExtendedGraphSettingTab } from "../settingTab";
import { SettingInteractives } from "./settingInteractive";
import { TFile } from "obsidian";

export class SettingFolders extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'folders', FOLDER_KEY, "Folders", 'folder', "Display folder boxes");
    }

    protected override isValueValid(name: string): boolean {
        return !!this.settingTab.app.vault.getFolderByPath(name);
    }

    protected override getPlaceholder(): string {
        return "folder/path";
    }

    protected override getAllTypes(): string[] {
        let allTypes = new Set<string>()

        const folders = this.settingTab.app.vault.getAllFolders(true);
        for (const folder of folders) {
            const n = folder.children.filter(f => f instanceof TFile).length;
            if (n > 0) {
                allTypes.add(folder.path)
            }
        }

        return [...allTypes].sort();
    }
}