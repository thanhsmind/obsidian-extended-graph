import { getAllTags, getLinkpath, TagCache, TFile } from "obsidian";
import { DataviewApi, getAPI as getDataviewAPI } from "obsidian-dataview";
import path from "path";
import { canonicalizeVarName, ExtendedGraphSettings, FOLDER_KEY, getDataviewPageProperties, PluginInstances, TAG_KEY } from "src/internal";

export function getFile(path: string): TFile | null {
    return PluginInstances.app.vault.getFileByPath(path);
}

export function getFileInteractives(interactive: string, file: TFile, settings?: ExtendedGraphSettings): Set<string> {
    if (PluginInstances.app.metadataCache.isUserIgnored(file.path)) return new Set();

    if (file.extension !== "md") return new Set<string>();
    switch (interactive) {
        case TAG_KEY:
            return getTags(file);
        case FOLDER_KEY:
            return getFolderPath(file);
        default:
            return getProperty(settings ?? PluginInstances.settings, interactive, file);
    }
}

export function getNumberOfFileInteractives(interactive: string, file: TFile, type: string): number {
    if (file.extension !== "md") return 0;
    switch (interactive) {
        case TAG_KEY:
            return getNumberOfTags(file, type);
        case FOLDER_KEY:
            return 1;
        default:
            return getNumberOfProperties(interactive, file, type);
    }
}

// ================================== TAGS ================================== //

function getTags(file: TFile): Set<string> {
    const metadataCache = PluginInstances.app.metadataCache.getCache(file.path);
    if (!metadataCache) return new Set<string>();

    const tags = getAllTags(metadataCache)?.map(t => t.replace('#', ''));
    if (!tags) return new Set<string>();

    return new Set<string>(tags.sort());
}

function getNumberOfTags(file: TFile, tag: string): number {
    const metadataCache = PluginInstances.app.metadataCache.getCache(file.path);
    if (!metadataCache) return 0;

    const tagWithHash = "#" + tag.replace('#', ''); // Ensure the tag starts with '#'
    const frontmatterTags: string[] = metadataCache.frontmatter?.tags?.filter((t: string) => t === tag || t === tagWithHash) || [];
    const contentTags: string[] = metadataCache.tags?.reduce((acc: string[], tagCache: TagCache) => {
        if (tagCache.tag === tag || tagCache.tag === tagWithHash) {
            acc.push(tagCache.tag);
        }
        return acc;
    }, []) || [];

    return frontmatterTags.length + contentTags.length;
}

// =============================== PROPERTIES =============================== //

function recursiveGetProperties(value: any, types: Set<string>): void {
    if (!value) return;
    if (typeof value === "string") {
        if (value.startsWith("[[") && value.endsWith("]]")) {
            const linkPath = getLinkpath(value.slice(2, value.length - 2));
            const displayTextIndex = linkPath.indexOf("|");
            const filepath = displayTextIndex >= 0 ? linkPath.slice(0, displayTextIndex) : linkPath;
            types.add(path.parse(filepath).name);
        }
        else {
            types.add(value);
        }
    }
    else if (typeof value === "number") {
        types.add(String(value));
    }
    else if ((typeof value === "object") && ("path" in value)) {
        // Dataview
        types.add(path.parse(value.path).name);
    }
    else if (Array.isArray(value)) {
        for (const v of value) {
            recursiveGetProperties(v, types);
        }
    }
}

function getProperty(settings: ExtendedGraphSettings, key: string, file: TFile): Set<string> {
    const dv = getDataviewAPI(PluginInstances.app);
    const types = new Set<string>();

    // With Dataview
    if (dv) {
        const sourcePage = dv.page(file.path);
        if (settings.canonicalizePropertiesWithDataview) {
            const uncanonicalizedKeys = Object.keys(sourcePage).filter(k => canonicalizeVarName(k) === canonicalizeVarName(key));
            const values = uncanonicalizedKeys.reduce((acc: any[], k: string) => {
                if (sourcePage[k] === null || sourcePage[k] === undefined || sourcePage[k] === '') {
                    return acc;
                }
                return acc.concat([sourcePage[k]]);
            }, []);
            if (values.length === 0) return new Set<string>();
            recursiveGetProperties(values, types);
        }
        else {
            const values = sourcePage[key];
            if (values === null || values === undefined || values === '') return new Set<string>();
            recursiveGetProperties(values, types);
        }
    }

    // Links in the frontmatter
    else {
        const frontmatter = PluginInstances.app.metadataCache.getFileCache(file)?.frontmatter;
        if (frontmatter?.hasOwnProperty(key)) {
            const values = frontmatter[key];
            recursiveGetProperties(values, types);
        }
    }

    return types;
}

function recursiveCountProperties(value: any, valueToMatch: string): number {
    if (typeof value === "string" || typeof value === "number") {
        if (valueToMatch === String(value)) return 1;
    }
    else if (value && (typeof value === "object") && ("path" in value)) {
        const targetFile = getFile(value.path);
        if (targetFile && PluginInstances.app.metadataCache.fileToLinktext(targetFile, value.path, true) === valueToMatch) {
            return 1;
        }
        else if (!targetFile && value.path === valueToMatch) {
            return 1;
        }
    }
    else if (Array.isArray(value)) {
        let result = 0;
        for (const v of value) {
            result += recursiveCountProperties(v, valueToMatch);
        }
        return result;
    }
    return 0;
}

function getNumberOfProperties(key: string, file: TFile, valueToMatch: string): number {
    const dv = getDataviewAPI(PluginInstances.app);

    // With Dataview
    if (dv) {
        const sourcePage = dv.page(file.path);
        const values = sourcePage[key];
        if (values === null || values === undefined || values === '') return 0;

        return recursiveCountProperties(values, valueToMatch);
    }

    // Links in the frontmatter
    else {
        const frontmatter = PluginInstances.app.metadataCache.getFileCache(file)?.frontmatter;
        if (frontmatter?.hasOwnProperty(key)) {
            const values = frontmatter[key];
            return recursiveCountProperties(values, valueToMatch);
        }
    }

    return 1;
}

export function getAllVaultProperties(settings: ExtendedGraphSettings): string[] {
    const dv = getDataviewAPI(PluginInstances.app);
    if (!dv) {
        return Object.keys(PluginInstances.app.metadataCache.getAllPropertyInfos());
    }
    else {
        return dv.pages().values.reduce((acc: string[], page: any) => {
            return acc.concat(getDataviewPageProperties(settings.canonicalizePropertiesWithDataview, page));
        }, []);
    }
}

// ================================ FOLDERS ================================= //

function getFolderPath(file: TFile): Set<string> {
    const set = new Set<string>();
    file.parent ? set.add(file.parent.path) : '';
    return set;
}

// ================================= LINKS ================================== //

export function getOutlinkTypes(settings: ExtendedGraphSettings, file: TFile): Map<string, Set<string>> {
    const dv = getDataviewAPI(PluginInstances.app);
    return dv ? getOutlinkTypesWithDataview(settings, dv, file) : getOutlinkTypesWithFrontmatter(file);
}

function getOutlinkTypesWithDataview(settings: ExtendedGraphSettings, dv: DataviewApi, file: TFile): Map<string, Set<string>> {
    const linkTypes = new Map<string, Set<string>>();
    const sourcePage = dv.page(file.path);
    for (const [key, value] of Object.entries(sourcePage)) {
        if (key === "file" || settings.imageProperties.contains(key)) continue;
        if (value === null || value === undefined || value === '') continue;

        // Check if the key is a canonicalized version of another key
        if (!settings.canonicalizePropertiesWithDataview && key === canonicalizeVarName(key) && Object.keys(sourcePage).some(k => canonicalizeVarName(k) === canonicalizeVarName(key) && k !== key)) {
            continue;
        }

        if (value && (typeof value === "object") && ("path" in value)) {
            const targetID = (value as { path: string }).path;
            let targetTypes = linkTypes.get(targetID);
            if (!targetTypes) {
                targetTypes = new Set<string>();
                linkTypes.set(targetID, targetTypes);
            }
            targetTypes.add(settings.canonicalizePropertiesWithDataview ? canonicalizeVarName(key) : key);
        }
        else if (Array.isArray(value)) {
            for (const l of value) {
                if (l && (typeof l === "object") && ("path" in l)) {
                    const targetID = (l as { path: string }).path;
                    let targetTypes = linkTypes.get(targetID);
                    if (!targetTypes) {
                        targetTypes = new Set<string>();
                        linkTypes.set(targetID, targetTypes);
                    }
                    targetTypes.add(settings.canonicalizePropertiesWithDataview ? canonicalizeVarName(key) : key);
                }
            }
        }
    }
    return linkTypes;
}

function getOutlinkTypesWithFrontmatter(file: TFile): Map<string, Set<string>> {
    const linkTypes = new Map<string, Set<string>>();
    const frontmatterLinks = PluginInstances.app.metadataCache.getFileCache(file)?.frontmatterLinks;
    if (frontmatterLinks && frontmatterLinks.length > 0) {
        // For each link in the frontmatters, check if target matches
        for (const linkCache of frontmatterLinks) {
            const linkType = linkCache.key.split('.')[0];
            const targetID = PluginInstances.app.metadataCache.getFirstLinkpathDest(linkCache.link, ".")?.path;
            if (targetID) {
                if (!linkTypes.has(targetID)) linkTypes.set(targetID, new Set<string>());
                linkTypes.get(targetID)?.add(linkType);
            }
        }
    }
    return linkTypes;
}