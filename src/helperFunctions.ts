import { App, getAllTags, TFile } from "obsidian";
import { getAPI as getDataviewAPI } from "obsidian-dataview";
import { WorkspaceLeafExt } from "./types/leaf";
import { FOLDER_KEY, TAG_KEY } from "./globalVariables";
import { GraphEngine, GraphRenderer, GraphView, LocalGraphView } from "obsidian-typings";

export function getSVGNode(n: string, v?: any): SVGElement {
    const svgNode = document.createElementNS("http://www.w3.org/2000/svg", n);
    for (var p in v)
        svgNode.setAttributeNS(null, p.replace(/[A-Z]/g, function(m, p, o, s) { return "-" + m.toLowerCase(); }), v[p]);
    return svgNode;
}

export function polar2Cartesian(x: number, y: number, r: number, theta: number) {
    return {
        x: x + (r * Math.cos(theta)),
        y: y + (r * Math.sin(theta))
    };
}

export function getBackgroundColor(renderer: GraphRenderer): Uint8Array {
    let bg = window.getComputedStyle(renderer.interactiveEl).backgroundColor;
    let el: Element = renderer.interactiveEl;
    while (bg.startsWith("rgba(") && bg.endsWith(", 0)") && el.parentElement) {
        el = el.parentElement as Element;
        bg = window.getComputedStyle(el).backgroundColor;
    }
    bg = bg.replace("rgba", "").replace("rgb", "").replace("(", "").replace(")", "");
    const RGB = bg.split(", ").map(c => parseInt(c));
    return Uint8Array.from(RGB);
}

export function capitalizeFirstLetter(val: string) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

export function isNumber(value: string) {
    return /^\d+(\.\d+)?$/.test(value);
}

interface Point {
    x: number;
    y: number;
}
export function bezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
    const cX = 3 * (p1.x - p0.x),
        bX = 3 * (p2.x - p1.x) - cX,
        aX = p3.x - p0.x - cX - bX;

    const cY = 3 * (p1.y - p0.y),
        bY = 3 * (p2.y - p1.y) - cY,
        aY = p3.y - p0.y - cY - bY;

    const x = (aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + p0.x;
    const y = (aY * Math.pow(t, 3)) + (bY * Math.pow(t, 2)) + (cY * t) + p0.y;

    return { x: x, y: y };
}

export function quadratic(t: number, p0: Point, p1: Point, p2: Point): Point {
    const c1x = (1 - t) * ((1 - t) * p0.x + t * p1.x);
    const c1y = (1 - t) * ((1 - t) * p0.y + t * p1.y);
    const c2x = t * ((1 - t) * p1.x + t * p2.x);
    const c2y = t * ((1 - t) * p1.y + t * p2.y);
    const x = c1x + c2x;
    const y = c1y + c2y;
    return { x: x, y: y };
}

// https://stackoverflow.com/questions/11854907/calculate-the-length-of-a-segment-of-a-quadratic-bezier
export function lengthQuadratic(t: number, p0: Point, p1: Point, p2: Point): number {
    const ax = p0.x - p1.x - p1.x + p2.x;
    const ay = p0.y - p1.y - p1.y + p2.y;
    const bx = p1.x + p1.x - p0.x - p0.x;
    const by = p1.y + p1.y - p0.y - p0.y;
    const A = 4.0 * ((ax * ax) + (ay * ay));
    const B = 4.0 * ((ax * bx) + (ay * by));
    const C =        (bx * bx) + (by * by) ;
    const b = B / (2.0 * A);
    const c = C / A;
    const u = t + b;
    const k = c - b * b;
    const b2k = Math.sqrt(b * b + k);
    const u2k = Math.sqrt(u * u + k);
    const L = 0.5 * Math.sqrt(A) * (
          (u * u2k)
        - (b * b2k)
        + (k * Math.log(Math.abs((u + u2k) / (b + b2k))))
    );
    return L;
}

export function getFile(app: App, path: string): TFile | null {
    return app.vault.getFileByPath(path);
}

export function getImageUri(app: App, keyProperty: string, path: string): string | null {
    const file = getFile(app, path);
    if (file) {
        const metadata = app.metadataCache.getFileCache(file);
        const frontmatter = metadata?.frontmatter;
        let imageLink = null;
        if (frontmatter) {
            if (typeof frontmatter[keyProperty] === "string") {
                imageLink = frontmatter[keyProperty]?.replace("[[", "").replace("]]", "");
            }
            else if (Array.isArray(frontmatter[keyProperty])) {
                imageLink = frontmatter[keyProperty][0]?.replace("[[", "").replace("]]", "");
            }
            const imageFile = imageLink ? app.metadataCache.getFirstLinkpathDest(imageLink, "."): null;
            const imageUri = imageFile ? app.vault.getResourcePath(imageFile): null;
            if (imageUri) return imageUri;
        }
    }
    return null;
}

export function getEngine(leaf: WorkspaceLeafExt): GraphEngine {
    if (leaf.view.getViewType() === "graph") {
        return (leaf.view as GraphView).dataEngine;
    }
    else if(leaf.view.getViewType() === "localgraph") {
        return (leaf.view as LocalGraphView).engine;
    }
    else {
        const err = "[Extended Graph plugin] Leaf is not a graph.";
        throw new Error(err);
    }
}

export function hasEngine(leaf: WorkspaceLeafExt): boolean {
    if (leaf.view.getViewType() === "graph") {
        return leaf.view.hasOwnProperty("dataEngine");
    }
    else {
        return leaf.view.hasOwnProperty("engine");
    }
}

export function getFileInteractives(interactive: string, app: App, file: TFile): Set<string> {
    if (file.extension !== "md") return new Set<string>();
    switch (interactive) {
        case TAG_KEY:
            return getTags(app, file);
        case FOLDER_KEY:
            return getFolderPath(file);
        default:
            return getProperty(interactive, app, file);
    }
}

function getTags(app: App, file: TFile): Set<string> {
    const metadataCache = app.metadataCache.getCache(file.path);
    if (!metadataCache) return new Set<string>();

    const tags = getAllTags(metadataCache)?.map(t => t.replace('#', ''));
    if (!tags) return new Set<string>();
    
    return new Set<string>(tags.sort());
}

function getProperty(key: string, app: App, file: TFile): Set<string> {
    const dv = getDataviewAPI();
    const types = new Set<string>();

    // With Dataview
    if (dv) {
        const sourcePage = dv.page(file.path);
        const values = sourcePage[key];
        if (values === null || values === undefined || values === '') return new Set<string>();

        if (typeof values === "string" || typeof values === "number") {
            types.add(String(values));
        }
        else if (Array.isArray(values)) {
            for (const value of values) {
                if (typeof value === "string" || typeof value === "number") {
                    types.add(String(value));
                }
            }
        }
    }

    // Links in the frontmatter
    else {
        const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
        if (frontmatter?.hasOwnProperty(key)) {
            if (typeof frontmatter[key] === "string" || typeof frontmatter[key] === "number") {
                types.add(String(frontmatter[key]));
            }
            else if (Array.isArray(frontmatter[key])) {
                for (const value of frontmatter[key]) {
                    if (typeof value === "string" || typeof value === "number") {
                        types.add(String(value));
                    }
                }
            }
        }
    }

    return types;
}

function getFolderPath(file: TFile): Set<string> {
    const set = new Set<string>();
    file.parent ? set.add(file.parent.path) : '';
    return set;
}

export function isPropertyKeyValid(key: string): boolean {
    if (key.contains(":")) {
        new Notice("Invalid character ':'");
        return false;
    }
    return (key.length> 0);
}

export function setPluginIcon(parent: HTMLElement): void {
    parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon git-fork-sparkles"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"/><path d="M12 12v3"/><path d="m 20.509365,13.686388 v 4"/><path d="m 22.509365,15.686388 h -4"/><path d="m 18.125575,20.191752 v 2"/><path d="m 19.125575,21.191752 h -2"/><path d="m 3.6865316,13.537545 v 2"/><path d="m 4.6865316,14.537545 h -2"/></svg>`;
}