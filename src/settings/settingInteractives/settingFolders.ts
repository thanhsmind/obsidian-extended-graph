import { TFile } from "obsidian";
import { ExtendedGraphSettingTab, FOLDER_KEY, SettingInteractives } from "src/internal";
import STRINGS from "src/Strings";

export class SettingFolders extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'folders', FOLDER_KEY, STRINGS.features.folders, 'folder', STRINGS.features.foldersDesc);
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