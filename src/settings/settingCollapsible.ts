import { ToggleComponent } from "obsidian";
import { ExtendedGraphSettingTab, Feature, GraphType, graphTypeLabels, SettingsSection } from "src/internal";


export abstract class SettingsSectionCollapsible extends SettingsSection {
    feature: Feature;
    interactiveKey: string;
    itemClasses: string[] = [];
    cssDisplayProperty: string;
    toggles: Partial<Record<GraphType, HTMLDivElement>> = {};
    
    constructor(settingTab: ExtendedGraphSettingTab, feature: Feature, key: string, title: string, icon: string, description: string) {
        super(settingTab, title, icon, description);

        this.feature = feature;
        this.interactiveKey = key;
        this.itemClasses.push(`setting-${this.feature}`);
        if (key !== '') this.itemClasses.push(`setting-${this.feature}-${key}`);
        this.cssDisplayProperty = `--display-settings-${this.feature}`;
    }

    override display() {
        super.display();

        this.elementsBody.forEach(el => {
            el.addClasses(this.itemClasses);
        });
    }

    protected override addHeader(): void {
        super.addHeader();
        this.addToggle('graph');
        this.addToggle('localgraph');
    }

    protected addToggle(graphType: GraphType) {
        let enable = this.settingTab.plugin.settings.enableFeatures[graphType][this.feature];
        if (this.feature === 'property-key') {
            enable = this.settingTab.plugin.settings.additionalProperties[this.interactiveKey];
        }
        this.toggles[graphType] = this.settingHeader.controlEl.createDiv();
        this.toggles[graphType].addClass("toggle-labelled");
        this.toggles[graphType].insertAdjacentText("afterbegin", graphTypeLabels[graphType])
        new ToggleComponent(this.toggles[graphType])
            .setValue(enable)
            .onChange(value => {
                this.toggle(graphType, value);
            });
        this.toggle(graphType, enable);
    }

    private toggle(graphType: GraphType, enable: boolean) {
        if (this.feature === 'property-key') {
            this.settingTab.plugin.settings.additionalProperties[this.interactiveKey] = enable;
        }
        else {
            this.settingTab.plugin.settings.enableFeatures[graphType][this.feature] = enable;
        }
        this.settingTab.plugin.saveSettings();

        if ((this.settingTab.plugin.settings.enableFeatures['graph'][this.feature]
            || this.settingTab.plugin.settings.enableFeatures['localgraph'][this.feature])
            || (this.feature === 'property-key' && enable)) {
            this.containerEl.style.setProperty(this.cssDisplayProperty, 'flex');
            this.settingHeader.settingEl.removeClass('is-collapsed');
        }
        else {
            this.containerEl.style.setProperty(this.cssDisplayProperty, 'none');
            this.settingHeader.settingEl.addClass('is-collapsed');
        }
    }
}