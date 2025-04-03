import { getIcon } from "obsidian";
import { getListOfSubpaths, IconicPlugin, IconizePlugin, int2hex, PluginInstances } from "src/internal";

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

        const svg = getIcon(data.icon);
        if (svg) return true;
    }

    return false;
}

export function hasIconInIconize(fullpath: string): boolean {
    const iconize: IconizePlugin | null = PluginInstances.app.plugins.getPlugin('obsidian-icon-folder') as IconizePlugin;
    if (!iconize
        || !iconize.hasOwnProperty("api")
        || !iconize.api.hasOwnProperty("util")
        || !iconize.api.util.hasOwnProperty("dom")
        || !iconize.api.util.dom.hasOwnProperty("getIconNodeFromPath")) return false;

    const paths = getListOfSubpaths(fullpath).reverse();

    for (const path of paths) {
        const iconNode = iconize.api.util.dom.getIconNodeFromPath(path);
        if (!iconNode) continue;

        const svg = iconNode.querySelector("svg") as SVGSVGElement;
        if (svg) return true;
    }

    return false;
}

export function getSvgFromIconic(path: string): { svg: SVGSVGElement, color: string | null } | null {
    const iconic: IconicPlugin | null = PluginInstances.app.plugins.getPlugin('iconic') as IconicPlugin;
    if (!iconic || !iconic.settings.fileIcons.hasOwnProperty(path)) return null;

    const data = iconic.settings.fileIcons[path];
    const svg = getIcon(data.icon);
    if (!svg) return null;

    const bodyStyle = getComputedStyle(document.body);
    let color: string | null = null;
    if (data.hasOwnProperty("color")) {
        color = bodyStyle.getPropertyValue(`--color-${data.color}`) || null;
    }

    return { svg, color };
}

export function getSvgFromIconize(path: string): { svg: SVGSVGElement, color: string | null } | null {
    const iconize: IconizePlugin | null = PluginInstances.app.plugins.getPlugin('obsidian-icon-folder') as IconizePlugin;
    if (!iconize) return null;

    const iconNode = iconize.api.util.dom.getIconNodeFromPath(path);
    if (!iconNode) return null;
    const svg = iconNode.querySelector("svg") as SVGSVGElement;
    if (!svg) return null;

    if (!iconize.hasOwnProperty("data")
        || !iconize.data.hasOwnProperty(path)
        || !iconize.data[path].hasOwnProperty("iconColor")) {
        return { svg, color: null };
    }
    const color = iconize.data[path].iconColor;
    return { svg: svg.cloneNode(true) as SVGSVGElement, color };
}