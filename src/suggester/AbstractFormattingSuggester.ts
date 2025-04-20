import { AbstractInputSuggest } from "obsidian";
import { PluginInstances } from "src/internal";

export abstract class AbstractFormattingSuggester extends AbstractInputSuggest<HTMLElement> {
    constructor(textInputEl: HTMLInputElement | HTMLDivElement) {
        super(PluginInstances.app, textInputEl);
    }

    protected getSuggestions(query: string): HTMLElement[] {
        return this.getStringSuggestions(query).sort().map(value => {
            const split = value.split(query);
            const el = createDiv();
            if (query === "") {
                el.setText(value);
                return el;
            }
            for (let i = 0; i < split.length - 1; ++i) {
                el.appendText(split[i]);
                const strong = createEl("strong");
                strong.setText(query);
                el.appendChild(strong);
            }
            el.appendText(split.last() ?? '');
            return el;
        });
    }

    protected abstract getStringSuggestions(query: string): string[];

    renderSuggestion(value: HTMLElement, el: HTMLElement): void {
        value.childNodes.forEach((childNode) => {
            el.appendChild(childNode.cloneNode(true));
        });
    }
}