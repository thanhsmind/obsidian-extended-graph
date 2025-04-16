import { ExtraButtonComponent, setIcon, Setting } from "obsidian";
import { ExtendedGraphSettingTab } from "src/internal";

export abstract class SettingsSection {
    settingTab: ExtendedGraphSettingTab;
    containerEl: HTMLElement;
    settingHeader: Setting;
    elementsBody: HTMLElement[] = [];
    title: string;
    icon: string;
    description: string;

    constructor(settingTab: ExtendedGraphSettingTab, title: string, icon: string, description: string) {
        this.settingTab = settingTab;
        this.containerEl = settingTab.containerEl;
        this.title = title;
        this.icon = icon;
        this.description = description;
    }

    display() {
        this.addHeader();
        this.addBody();
        this.addToNav();
    }

    protected addHeader(): void {
        this.settingHeader = new Setting(this.containerEl)
            .setName(this.title)
            .setHeading();

        if (this.icon && this.icon !== "") {
            this.settingHeader.then((setting) => {
                const iconEl = createDiv();
                setting.settingEl.prepend(iconEl);
                if (this.icon) {
                    setIcon(iconEl, this.icon);
                }
            });
        }

        this.settingHeader.setDesc(this.description);
    }

    protected abstract addBody(): void;

    protected addToNav(): void {
        if (this.icon === "") return;
        const nav = this.settingTab.containerEl.querySelector(".extended-graph-nav-settings") as HTMLDivElement;
        if (!nav) return;

        const button = new ExtraButtonComponent(nav);
        button.setIcon(this.icon)
            .onClick(() => {
                this.settingHeader.settingEl.scrollIntoView();
            })
            .setTooltip(this.title);
    }
}