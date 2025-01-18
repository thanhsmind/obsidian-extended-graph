import { TAG_KEY } from "src/globalVariables";
import { ExtendedGraphSettingTab } from "../settingTab";
import { SettingInteractives } from "./settingInteractive";
import { Setting } from "obsidian";
import { addHeading } from "../settingHelperFunctions";
import { capitalizeFirstLetter } from "src/helperFunctions";

export class SettingTags extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab);
        this.interactiveName = TAG_KEY;
        this.elementName = "node";
        this.previewClass = "arc";
        this.icon = "tags";
    }
    
    protected addHeading(): Setting {
        return addHeading({
            containerEl       : this.settingTab.containerEl,
            heading           : capitalizeFirstLetter(this.interactiveName + 's'),
            icon              : this.icon,
            description       : "Display and filter tag types",
            displayCSSVariable: '--display-tag-features',
            enable            : this.settingTab.plugin.settings.enableTags,
            updateToggle      : (function(value: boolean) {
                this.settingTab.plugin.settings.enableTags = value;
            }).bind(this),
            settingTab: this.settingTab
        });
    }

    display(): void {
        super.display();

        this.allTopElements.forEach(el => {
            el.addClass("extended-graph-setting-" + this.interactiveName);
        })
    }

    protected saveColor(preview: HTMLDivElement, type: string, color: string) {
        if (this.isValueValid(type)) {
            this.updatePreview(preview, type, color);
            super.saveColors(type);
        }
        else {
            preview.innerText = "";
        }
    }

    protected isValueValid(name: string): boolean {
        return /^[a-zA-Z/]+$/.test(name);
    }

    protected getPlaceholder(): string {
        return "tag";
    }

    protected updatePreview(preview: HTMLDivElement, type?: string, color?: string) {
        this.updateCSS(preview, color);
    }
}