import { PluginInstances } from "src/pluginInstances";
import { InteractivesSuggester } from "./InteractivesSuggester";

export class InteractivesColorSuggester extends InteractivesSuggester {
    typeToInclude?: string;

    protected override getStringSuggestions(query: string): string[] {
        const values = super.getStringSuggestions(query);
        let alreadyExistingValues: string[] = [];
        if (this.key && this.key !== 'property') {
            alreadyExistingValues = PluginInstances.settings.interactiveSettings[this.key].colors.map(c => c.type);
        }
        else if (this.key === 'property' && this.propertyKey) {
            alreadyExistingValues = PluginInstances.settings.interactiveSettings[this.propertyKey].colors.map(c => c.type);
        }
        return values.filter(type => (type === this.typeToInclude) || !alreadyExistingValues.includes(type));
    }
}