import { Setting } from "obsidian";
import { ExtendedGraphSettingTab } from "./settingTab";
import { addHeading } from "./settingHelperFunctions";

export class SettingFocus {
    settingTab: ExtendedGraphSettingTab;
    allTopElements: HTMLElement[] = [];
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        this.settingTab = settingTab;
    }

    display() {
        const containerEl = this.settingTab.containerEl;

        addHeading({
            containerEl       : containerEl,
            heading           : "Focus",
            icon              : 'telescope',
            description       : "Scale up the node corresponding to the active note",
            displayCSSVariable: '--display-focus-features',
            enable            : this.settingTab.plugin.settings.enableFocusActiveNote,
            updateToggle      : (function(value: boolean) {
                this.settingTab.plugin.settings.enableFocusActiveNote = value;
            }).bind(this),
            settingTab        : this.settingTab
        })

        this.allTopElements.push(
            new Setting(containerEl)
                .setName('Scale factor')
                .setDesc('The node corresponding to the currently active note will be scaled up by this factor.')
                .addText(cb => cb
                    .setValue(this.settingTab.plugin.settings.focusScaleFactor.toString())
                    .onChange(async (value) => {
                        const n = parseFloat(value);
                        if (n) {
                            this.settingTab.plugin.settings.focusScaleFactor = n;
                            await this.settingTab.plugin.saveSettings();
                        }
                }))
                .settingEl
        );

        this.allTopElements.forEach(el => {
            el.addClass("extended-graph-setting-focus");
        })
    }
}