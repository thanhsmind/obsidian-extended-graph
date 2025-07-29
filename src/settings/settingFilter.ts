import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, FilesSuggester, PluginInstances, SettingsSection, t, UIElements } from "src/internal";

export class SettingFilter extends SettingsSection {
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'filter', t("features.ids.filter"), t('features.filters'), 'file-x', t('features.filtersDesc'));
    }

    protected override addBody(): void {
        this.addNewFilterSetting();
        for (const filter of PluginInstances.settings.filterAbstractFiles) {
            this.addRegex(filter);
        }
    }

    private addNewFilterSetting() {
        const setting = new Setting(this.settingTab.containerEl).setName(t("query.excludeRegex"));
        setting.addExtraButton(cb => {
            UIElements.setupExtraButton(cb, 'add');
            cb.onClick(async () => {
                const lastDiv = this.elementsBody.last() ?? setting.settingEl;
                const newFilter = { regex: "", flag: "" };
                PluginInstances.settings.filterAbstractFiles.push(newFilter);
                const regexSetting = this.addRegex(newFilter);
                lastDiv.insertAdjacentElement('afterend', regexSetting.settingEl);
                await PluginInstances.plugin.saveSettings();
            });
        });

        this.elementsBody.push(setting.settingEl);
    }

    private addRegex(filter: { regex: string, flag: string }): Setting {
        const setting = new Setting(this.settingTab.containerEl)
            .addSearch(search => {
                new FilesSuggester(search.inputEl, (value: string) => {
                    filter.regex = value;
                    PluginInstances.plugin.saveSettings();
                });
                search.setValue(filter.regex);
                search.onChange((value) => {
                    filter.regex = value;
                    PluginInstances.plugin.saveSettings();
                });
            })
            .addText(cb => {
                cb.setPlaceholder("flag")
                    .setValue(filter.flag)
                    .onChange((value) => {
                        filter.flag = value;
                        PluginInstances.plugin.saveSettings();
                    });
            });

        setting.addExtraButton(cb => {
            UIElements.setupExtraButton(cb, 'delete');
            cb.onClick(() => {
                PluginInstances.settings.filterAbstractFiles.remove(filter);
                PluginInstances.plugin.saveSettings();
                setting.settingEl.remove();
                this.elementsBody.remove(setting.settingEl);
            });
        });

        this.elementsBody.push(setting.settingEl);
        setting.settingEl.addClasses(this.itemClasses);
        return setting;
    }
}