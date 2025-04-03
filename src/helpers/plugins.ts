import { getIcon } from "obsidian";
import { getListOfSubpaths, IconicPlugin, IconizePlugin, int2hex, isEmoji, PluginInstances } from "src/internal";

export function hasIconInIconic(fullpath: string): boolean {
    const iconic: IconicPlugin | null = PluginInstances.app.plugins.getPlugin('iconic') as IconicPlugin;
    if (!iconic
        || !iconic.hasOwnProperty("settings")
        || !iconic.settings.hasOwnProperty("fileIcons")) return false;

    const paths = getListOfSubpaths(fullpath).reverse();

    for (const path of paths) {
        if (!iconic.settings.fileIcons.hasOwnProperty(path)) continue;

        const data = iconic.settings.fileIcons[path];
        if (!data.hasOwnProperty("icon")) continue;

        // SVG icon
        if (data.icon.startsWith("lucide-")) {
            const svg = getIcon(data.icon);
            if (svg) return true;
        }
        // Emoji icon
        else {
            if (isEmoji(data.icon)) {
                return true;
            }
        }
    }

    return false;
}

export function hasIconInIconize(fullpath: string): boolean {
    const iconize: IconizePlugin | null = PluginInstances.app.plugins.getPlugin('obsidian-icon-folder') as IconizePlugin;
    if (!iconize
        || !iconize.hasOwnProperty("api")
        || !iconize.api.hasOwnProperty("util")
        || !iconize.api.util.hasOwnProperty("dom")
        || !iconize.api.util.dom.hasOwnProperty("getIconNodeFromPath")
        || !iconize.hasOwnProperty("data")) return false;

    const paths = getListOfSubpaths(fullpath).reverse();

    for (const path of paths) {
        // Check if there is an icon for the path
        const iconNode = iconize.api.util.dom.getIconNodeFromPath(path);
        if (iconNode) {
            const svg = iconNode.querySelector("svg") as SVGSVGElement;
            if (svg) return true;
        }

        // Check if there is an emoji for the path
        if (iconize.data.hasOwnProperty(path)) {
            const emoji = iconize.data[path];
            if (typeof emoji === "string" && emoji !== "" && isEmoji(emoji)) {
                return true;
            }
        }
    }

    return false;
}

export function getSvgFromIconic(path: string): { svg: SVGSVGElement | null, color: string | null, emoji: string | null } | null {
    const iconic: IconicPlugin | null = PluginInstances.app.plugins.getPlugin('iconic') as IconicPlugin;
    if (!iconic || !iconic.settings.fileIcons.hasOwnProperty(path)) return null;

    const data = iconic.settings.fileIcons[path];

    // SVG icon
    if (data.icon.startsWith("lucide-")) {
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

    else if (isEmoji(data.icon)) {
        return { svg: null, color: null, emoji: data.icon };
    }

    return null;
}

export function getSvgFromIconize(path: string): { svg: SVGSVGElement | null, color: string | null, emoji: string | null } | null {
    const iconize: IconizePlugin | null = PluginInstances.app.plugins.getPlugin('obsidian-icon-folder') as IconizePlugin;
    if (!iconize) return null;

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