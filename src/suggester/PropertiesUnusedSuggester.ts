import { PropertiesSuggester } from "src/internal";
import { ExtendedGraphInstances } from "src/pluginInstances";

export class PropertiesUnusedSuggester extends PropertiesSuggester {
    protected getStringSuggestions(query: string): string[] {
        const properties = super.getStringSuggestions(query);
        return properties.filter(p => !(p in ExtendedGraphInstances.settings.additionalProperties))
    }
}