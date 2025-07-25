import { getIcon, Plugin } from "obsidian";
import { GraphView, LocalGraphView } from "obsidian-typings";
import { canonicalizeVarName, GraphBannerPlugin, IconicPlugin, IconizePlugin, isEmoji, NLPPlugin, PluginInstances } from "src/internal";


// ======================== Iconic

export function getIconicPlugin(): IconicPlugin | null {
    return PluginInstances.app.plugins.getPlugin('iconic') as IconicPlugin;
}

export function getSvgFromIconic(path: string): { svg: SVGSVGElement | null, color: string | null, emoji: string | null } | null {
    const iconic = getIconicPlugin();
    if (!iconic
        || !iconic.hasOwnProperty("ruleManager")
        || !(typeof iconic.ruleManager.checkRuling === "function")
        || !(typeof iconic.getFileItem === "function")) return null;

    // Check for an icon ruling
    const page = PluginInstances.app.vault.getFolderByPath(path) ? 'folder' : 'file';
    const data = iconic.ruleManager.checkRuling(page, path) ?? iconic.getFileItem(path);

    // SVG icon
    if (data.icon?.startsWith("lucide-")) {
        const svg = getIcon(data.icon);
        if (svg) {
            const bodyStyle = getComputedStyle(document.body);
            let color: string | null = null;
            if (data.hasOwnProperty("color")) {
                color = bodyStyle.getPropertyValue(`--color-${data.color}`) || null;
            }

            return { svg, color, emoji: null };
        }
    }

    else if (data.icon && isEmoji(data.icon)) {
        return { svg: null, color: null, emoji: data.icon };
    }

    return null;
}

// ======================== Iconize

export function getSvgFromIconize(path: string): { svg: SVGSVGElement | null, color: string | null, emoji: string | null } | null {
    const iconize: IconizePlugin | null = PluginInstances.app.plugins.getPlugin('obsidian-icon-folder') as IconizePlugin;
    if (!iconize
        || !iconize.hasOwnProperty("api")
        || !iconize.api.hasOwnProperty("util")
        || !iconize.api.util.hasOwnProperty("dom")
        || !iconize.api.util.dom.hasOwnProperty("getIconNodeFromPath")
        || !iconize.hasOwnProperty("data")) return null;

    // Try to get an SVG
    const iconNode = iconize.api.util.dom.getIconNodeFromPath(path);
    if (iconNode) {
        const svg = iconNode.querySelector("svg") as SVGSVGElement;
        if (svg) {
            if (!iconize.hasOwnProperty("data")
                || !iconize.data.hasOwnProperty(path)
                || !iconize.data[path].hasOwnProperty("iconColor")) {
                return { svg, color: null, emoji: null };
            }
            const color = iconize.data[path].iconColor;
            return { svg: svg.cloneNode(true) as SVGSVGElement, color, emoji: null };
        }
    }

    // Try to get an emoji
    if (iconize.data.hasOwnProperty(path)) {
        const emoji = iconize.data[path];
        if (typeof emoji === "string" && emoji !== "" && isEmoji(emoji)) {
            return { svg: null, color: null, emoji };
        }
    }

    return null;
}

// ======================== Graph banner

export function isGraphBannerLoaded(): boolean {
    return this.app.plugins.getPlugin('graph-banner')?._loaded;
}

export function getGraphBannerClass(): string {
    return "graph-banner-content";
}

export function isGraphBannerView(view: LocalGraphView | GraphView) {
    return view.contentEl.classList.contains(getGraphBannerClass());
}

export function getGraphBannerPlugin(): GraphBannerPlugin | undefined {
    return PluginInstances.app.plugins.getPlugin('graph-banner') as GraphBannerPlugin
}

// ======================== Dataview

export function getDataviewPageProperties(canonicalizeProperties: boolean, page: any): string[] {
    const properties: string[] = [];
    for (const [key, value] of Object.entries(page)) {
        if (key === "file") continue;
        if (value === null || value === undefined || value === '') continue;

        // Check if the key is a canonicalized version of another key
        if (!canonicalizeProperties && key === canonicalizeVarName(key) && Object.keys(page).some(k => canonicalizeVarName(k) === canonicalizeVarName(key) && k !== key)) {
            continue;
        }

        properties.push(canonicalizeProperties ? canonicalizeVarName(key) : key);
    }
    return properties;
}

// ======================== NLP

export function getNLPPlugin(): NLPPlugin | undefined {
    const nlp = PluginInstances.app.plugins.getPlugin("nlp") as NLPPlugin;
    if (!nlp) {
        return;
    } else if (!nlp?.settings?.refreshDocsOnLoad) {
        return;
    } else {
        return nlp;
    }
}