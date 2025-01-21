import { TAG_KEY } from "src/globalVariables";
import { ExtendedGraphSettingTab } from "../settingTab";
import { SettingInteractives } from "./settingInteractive";

export class SettingTags extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'tags', TAG_KEY, "Tags", 'tags', "Display and filter by tags");
    }

    protected override isValueValid(name: string): boolean {
        return /^[a-zA-Z/]+$/.test(name);
    }

    protected override getPlaceholder(): string {
        return "tag";
    }
}