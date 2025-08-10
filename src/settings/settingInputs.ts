import { Modifier, Platform, Setting } from "obsidian";
import { ExtendedGraphSettingTab, ExtendedGraphInstances, SettingsSection, t } from "src/internal";

export class SettingInput extends SettingsSection {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'inputs', t("features.ids.inputs"), t("inputs.inputs"), 'mouse', "");
    }

    protected override addBody() {
        this.addRadialMenu();
        this.addPinHotkey();

        this.checkCompatibility();
    }

    private addRadialMenu() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("inputs.radialMenu"))
            .setDesc(t("inputs.radialMenuDesc"))
            .addDropdown(cb => {
                cb.addOptions({
                    '': '',
                    'Mod': Platform.isMacOS ? 'Cmd (Mod)' : 'Ctrl (Mod)',
                    'Ctrl': 'Ctrl',
                    'Meta': Platform.isMacOS ? 'Cmd (Meta)' : 'Win',
                    'Shift': 'Shift',
                    'Alt': 'Alt'
                });
                cb.setValue(ExtendedGraphInstances.settings.useRadialMenu ? ExtendedGraphInstances.settings.radialMenuModifier : '');
                cb.onChange(async (value) => {
                    if (value === '') {
                        ExtendedGraphInstances.settings.useRadialMenu = false;
                    }
                    else {
                        ExtendedGraphInstances.settings.useRadialMenu = true;
                        ExtendedGraphInstances.settings.radialMenuModifier = value as Modifier;
                    }
                    await ExtendedGraphInstances.plugin.saveSettings();
                    this.checkCompatibility();
                })
            });

        this.elementsBody.push(setting.settingEl);
    }

    private addPinHotkey() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("inputs.pinHotkey"))
            .setDesc(t("inputs.pinHotkeyDesc"))
            .addDropdown(cb => {
                cb.addOptions({
                    '': '',
                    'Mod': Platform.isMacOS ? 'Cmd (Mod)' : 'Ctrl (Mod)',
                    'Ctrl': 'Ctrl',
                    'Meta': Platform.isMacOS ? 'Cmd (Meta)' : 'Win',
                    'Shift': 'Shift',
                    'Alt': 'Alt'
                });
                cb.setValue(ExtendedGraphInstances.settings.pinNodeModifier ? ExtendedGraphInstances.settings.pinNodeModifier : '');
                cb.onChange(async (value) => {
                    if (value === '') {
                        ExtendedGraphInstances.settings.pinNodeModifier = undefined;
                    }
                    else {
                        ExtendedGraphInstances.settings.pinNodeModifier = value as Modifier;
                    }
                    await ExtendedGraphInstances.plugin.saveSettings();
                    this.checkCompatibility();
                })
            });

        this.elementsBody.push(setting.settingEl);
    }

    private checkCompatibility() {
        const rightClickModifiers = [
            ExtendedGraphInstances.settings.radialMenuModifier,
            ExtendedGraphInstances.settings.pinNodeModifier
        ];
        const rightClickCompatibility = rightClickModifiers.unique().length === rightClickModifiers.length;

        if (!rightClickCompatibility) {
            this.settingHeader.setDesc(t("inputs.rightClickIncompatibility"));
        }
        else {
            this.settingHeader.setDesc("");
        }
        this.settingHeader.descEl.toggleClass("error", !rightClickCompatibility);
    }
}