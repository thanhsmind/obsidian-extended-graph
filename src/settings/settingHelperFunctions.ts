import { setIcon, Setting } from "obsidian";
import { ExtendedGraphSettingTab } from "./settingTab";

export function addHeading(options: {
    containerEl: HTMLElement,
    heading: string,
    icon?: string,
    description?: string,
    displayCSSVariable?: string,
    enable?: boolean,
    updateToggle?: (value: boolean) => void,
    settingTab?: ExtendedGraphSettingTab
}): Setting
{
    const setting = new Setting(options.containerEl)
        .setName(options.heading)
        .setHeading();
        
    if (options.icon && options.icon !== "") {
        setting.then((setting) => {
            const iconEl = createDiv();
            setting.settingEl.prepend(iconEl);
            if (options.icon) {
                setIcon(iconEl, options.icon);
            }
        });
    }

    if (options.description) {
        setting.setDesc(options.description);
    }

    if (options.enable !== undefined) {
        setting.addToggle(cb => {
            cb.setValue(!!options.enable);
            if (options.displayCSSVariable) {
                options.containerEl.style.setProperty(options.displayCSSVariable, options.enable ? 'flex' : 'none');
            }
            cb.onChange(value => {
                if (options.updateToggle) {
                    options.updateToggle(value);
                }
                options.settingTab?.plugin.saveSettings();
                if (options.displayCSSVariable) {
                    options.settingTab?.containerEl.style.setProperty(options.displayCSSVariable, value ? 'flex' : 'none');
                }
            });
        });
    }
    
    return setting;
}