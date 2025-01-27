import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, SettingsSectionCollapsible } from "src/internal";

export class SettingFocus extends SettingsSectionCollapsible {
    allTopElements: HTMLElement[] = [];
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'focus', '', "Focus", 'telescope', "Scale up the node corresponding to the active note");
    }

    protected override addHeader(): void {
        super.addHeader();
        this.toggles['localgraph']?.style.setProperty("display", "none");
    }

    protected override addBody(): void {
        this.elementsBody.push(
            new Setting(this.settingTab.containerEl)
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
                })).settingEl
        );
    }
}