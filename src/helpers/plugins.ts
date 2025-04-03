import { getIcon } from "obsidian";
import { IconicPlugin, IconizePlugin, PluginInstances } from "src/internal";

export function hasIconInIconic(id: string): boolean {
    const iconic: IconicPlugin | null = PluginInstances.app.plugins.getPlugin('iconic') as IconicPlugin;
    if (!iconic
        || !iconic.hasOwnProperty("settings")
        || !iconic.settings.hasOwnProperty("fileIcons")
        || !iconic.settings.fileIcons.hasOwnProperty(id)) return false;

    const data = iconic.settings.fileIcons[id];
    if (!data.hasOwnProperty("icon")) return false;

    const svg = getIcon(data.icon);
    if (!svg) return false;

    return true;
}

export function hasIconInIconize(id: string): boolean {
    const iconize: IconizePlugin | null = PluginInstances.app.plugins.getPlugin('obsidian-icon-folder') as IconizePlugin;
    if (!iconize
        || !iconize.hasOwnProperty("api")
        || !iconize.api.hasOwnProperty("util")
        || !iconize.api.util.hasOwnProperty("dom")
        || !iconize.api.util.dom.hasOwnProperty("getIconNodeFromPath")) return false;

    const iconNode = iconize.api.util.dom.getIconNodeFromPath(id);
    if (!iconNode) return false;

    const svg = iconNode.querySelector("svg") as SVGSVGElement;
    if (!svg) return false;

    return true;
}