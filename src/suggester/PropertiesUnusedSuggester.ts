import { PropertiesSuggester } from "src/internal";
import { PluginInstances } from "src/pluginInstances";

export class PropertiesUnusedSuggester extends PropertiesSuggester {
    protected getStringSuggestions(query: string): string[] {
        const properties = super.getStringSuggestions(query);
        return properties.filter(p => !(p in PluginInstances.settings.additionalProperties))
    }
}