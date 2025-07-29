import { Modifier, Platform, Setting } from "obsidian";
import { ExtendedGraphSettingTab, PluginInstances, SettingsSection, t } from "src/internal";

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
                cb.setValue(PluginInstances.settings.useRadialMenu ? PluginInstances.settings.radialMenuModifier : '');
                cb.onChange(async (value) => {
                    if (value === '') {
                        PluginInstances.settings.useRadialMenu = false;
                    }
                    else {
                        PluginInstances.settings.useRadialMenu = true;
                        PluginInstances.settings.radialMenuModifier = value as Modifier;
                    }
                    await PluginInstances.plugin.saveSettings();
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
                cb.setValue(PluginInstances.settings.pinNodeModifier ? PluginInstances.settings.pinNodeModifier : '');
                cb.onChange(async (value) => {
                    if (value === '') {
                        PluginInstances.settings.pinNodeModifier = undefined;
                    }
                    else {
                        PluginInstances.settings.pinNodeModifier = value as Modifier;
                    }
                    await PluginInstances.plugin.saveSettings();
                    this.checkCompatibility();
                })
            });

        this.elementsBody.push(setting.settingEl);
    }

    private checkCompatibility() {
        const rightClickModifiers = [
            PluginInstances.settings.radialMenuModifier,
            PluginInstances.settings.pinNodeModifier
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