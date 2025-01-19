import { Setting } from "obsidian";
import { ExtendedGraphSettingTab } from "./settingTab";
import { isPropertyKeyValid } from "src/helperFunctions";
import { addHeading } from "./settingHelperFunctions";

export class SettingShapes {
    settingTab: ExtendedGraphSettingTab;
    allTopElements: HTMLElement[] = [];
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        this.settingTab = settingTab;
    }

    display() {
        addHeading({
            containerEl: this.settingTab.containerEl,
            heading: "Shapes",
            icon: 'shapes',
            description: "Use nodes of various shapes",
            displayCSSVariable: '--display-shapes-features',
            enable: this.settingTab.plugin.settings.enableShapes,
            updateToggle: (function (value: boolean) {
                this.settingTab.plugin.settings.enableShapes = value;
            }).bind(this),
            settingTab: this.settingTab
        })

        this.allTopElements.forEach(el => {
            el.addClass("extended-graph-setting-shapes");
        })
    }
}