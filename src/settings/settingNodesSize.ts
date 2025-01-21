import { Setting } from "obsidian";
import { ExtendedGraphSettingTab } from "./settingTab";
import { SettingsSectionCollapsible } from "./settingCollapsible";
import { isPropertyKeyValid } from "src/helperFunctions";
import { NodeShape } from "src/graph/graphicElements/nodes/shapes";

export class SettingNodeSize extends SettingsSectionCollapsible {
    allTopElements: HTMLElement[] = [];
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'node-size', '', "Nodes size", 'circle-arrow-out-up-right', "Choose how nodes sizes must be computed");
    }

    protected override addBody(): void {
        this.addNodeSizeProperty();
        this.addNodeSizeFunction();
    }

    private addNodeSizeProperty(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName('Node size property')
            .setDesc(`Name of the property used to specify the size of the node. It must be of type number. A value of ${NodeShape.RADIUS} is the default. Leave empty if you don't need a per-node granularity.`)
            .addText(cb => cb
                .setValue(this.settingTab.plugin.settings.nodeSizeProperty)
                .onChange(async (key) => {
                    if (isPropertyKeyValid(key)) {
                        this.settingTab.plugin.settings.nodeSizeProperty = key;
                        await this.settingTab.plugin.saveSettings();
                    }
            }));
            
        this.elementsBody.push(setting.settingEl);
    }

    private addNodeSizeFunction(): void {

    }
}