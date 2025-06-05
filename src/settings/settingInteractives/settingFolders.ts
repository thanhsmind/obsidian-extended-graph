import { Setting, TFile } from "obsidian";
import { ExtendedGraphSettingTab, FOLDER_KEY, PluginInstances, SettingInteractives } from "src/internal";
import STRINGS from "src/Strings";

export class SettingFolders extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'folders', FOLDER_KEY, STRINGS.features.folders, 'folder', STRINGS.features.foldersDesc);
    }

    protected override addBody(): void {
        super.addBody();

        this.addFolderRadius();
        this.addShowFullPath();
    }

    private addFolderRadius() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.foldersRadius)
            .setDesc(STRINGS.features.foldersRadiusDesc)
            .addText(cb => {
                cb.setValue(PluginInstances.settings.folderRadius.toString())
                    .onChange(async (value) => {
                        const intValue = parseInt(value);
                        if (!isNaN(intValue) && intValue >= 0) {
                            PluginInstances.settings.folderRadius = intValue;
                            await PluginInstances.plugin.saveSettings();
                        }
                    });
            }).settingEl);
    }

    private addShowFullPath() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.folderShowFullPath)
            .setDesc(STRINGS.features.folderShowFullPathDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.folderShowFullPath)
                    .onChange(async (value) => {
                        PluginInstances.settings.folderShowFullPath = value;
                        await PluginInstances.plugin.saveSettings();
                    });
            }).settingEl);
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