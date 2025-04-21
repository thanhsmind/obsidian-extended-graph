import { Setting } from "obsidian";
import { Feature, graphTypeLabels, PluginInstances } from "src/internal";

export class FeatureSetting extends Setting {
    constructor(containerEl: HTMLElement, name: string, desc: string, feature: Feature) {
        super(containerEl);
        if (name !== "") this.setName(name);
        if (desc !== "") this.setDesc(desc);

        this.addToggle(cb => {
            cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['graph']);
            cb.setValue(PluginInstances.settings.enableFeatures['graph'][feature]);
            cb.onChange(value => {
                PluginInstances.settings.enableFeatures['graph'][feature] = value;
                PluginInstances.plugin.saveSettings();
            })
        })
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['localgraph']);
                cb.setValue(PluginInstances.settings.enableFeatures['localgraph'][feature]);
                cb.onChange(value => {
                    PluginInstances.settings.enableFeatures['localgraph'][feature] = value;
                    PluginInstances.plugin.saveSettings();
                })
            })
    }
}