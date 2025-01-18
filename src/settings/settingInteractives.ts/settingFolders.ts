import { FOLDER_KEY } from "src/globalVariables";
import { ExtendedGraphSettingTab } from "../settingTab";
import { SettingInteractives } from "./settingInteractive";
import { Setting, TFile } from "obsidian";
import { addHeading } from "../settingHelperFunctions";
import { capitalizeFirstLetter } from "src/helperFunctions";

export class SettingFolders extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab);
        this.interactiveName = FOLDER_KEY;
        this.elementName = "folder";
        this.previewClass = "";
        this.icon = "folder";
    }
    
    protected addHeading(): Setting {
        return addHeading({
            containerEl       : this.settingTab.containerEl,
            heading           : capitalizeFirstLetter(this.interactiveName + 's'),
            icon              : this.icon,
            description       : "Display folder boxes",
            displayCSSVariable: '--display-folder-features',
            enable            : this.settingTab.plugin.settings.enableFolders,
            updateToggle      : (function(value: boolean) {
                this.settingTab.plugin.settings.enableFolders = value;
            }).bind(this),
            settingTab        : this.settingTab
        });
    }

    display(): void {
        super.display();

        this.allTopElements.forEach(el => {
            el.addClass("extended-graph-setting-" + this.interactiveName);
        });
    }

    protected saveColor(preview: HTMLDivElement, type: string, color: string) {
        if (this.isValueValid(type)) {
            this.updatePreview(preview, type, color);
            super.saveColors(type);
        }
    }

    protected isValueValid(name: string): boolean {
        return !!this.settingTab.app.vault.getFolderByPath(name);
    }

    protected getPlaceholder(): string {
        return "folder/path";
    }

    protected updatePreview(preview: HTMLDivElement, type?: string, color?: string) {
        this.updateCSS(preview, color);
    }

    protected getAllTypes(): string[] {
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