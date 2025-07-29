import { Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { Bow, WinkMethods } from "wink-nlp";

// ======================== Iconize

export interface IconizePlugin extends Plugin {
    api: {
        /**
         * Returns the {@link Icon} for the given icon name. It is important, that the icon name
         * contains the icon pack prefix.
         * @param iconNameWithPrefix String that contains the icon pack prefix combined with the
         * icon name.
         * @returns Icon if it exists, `null` otherwise.
         */
        getIconByName: (iconNameWithPrefix: string) => {
            filename: string;
            iconPackName: string;
            name: string;
            prefix: string;
            svgContent: string;
            svgElement: string;
            svgViewBox: string;
        } | null;
        util: {
            dom: {
                /**
                 * Checks if the element has an icon node by checking if the element has a child with the
                 * class `iconize-icon`.
                 * @param element HTMLElement which will be checked if it has an icon.
                 * @returns Boolean whether the element has an icon node or not.
                 */
                doesElementHasIconNode(element: HTMLElement): boolean;
                /**
                 * Gets the icon name of the element if it has an icon node.
                 * @param element HTMLElement parent which includes a node with the icon.
                 * @returns String with the icon name if the element has an icon, `undefined` otherwise.
                 */
                getIconFromElement: (element: HTMLElement) => string | undefined;
                getIconNodeFromPath: (path: string) => HTMLElement;
            },
            svg: {
                /**
                 * Extracts an SVG string from a given input string and returns a cleaned up and
                 * formatted SVG string.
                 * @param svgString SVG string to extract from.
                 * @returns Cleaned up and formatted SVG string.
                 */
                extract: (svgString: string) => string;

                /**
                 * Sets the font size of an SVG string by modifying its width and/or height attributes.
                 * The font size will be always set in pixels.
                 * @param svgString SVG string to modify.
                 * @param fontSize Font size in pixels to set.
                 * @returns Modified SVG string.
                 */
                setFontSize: (svgString: string, fontSize: number) => string;

                /**
                 * Replaces the fill or stroke color of an SVG string with a given color.
                 * @param svgString SVG string to modify.
                 * @param color Color to set. Defaults to 'currentColor'.
                 * @returns The modified SVG string.
                 */
                colorize: (svgString: string, color: string) => string;
            }
        }
    },
    data: Record<string, { iconName?: string, iconColor: string } | string>
}

// ======================== Iconic

export type IconicRulePage = 'file' | 'folder';

export interface IconicRuleItem extends IconicItem {
    category: 'rule';
    match: 'all' | 'any' | 'none';
    conditions: IconicConditionItem[];
    enabled: boolean;
}

export interface IconicConditionItem {
    source: string;
    operator: string;
    value: string;
}

export interface IconicIcon {
    icon: string | null;
    color: string | null;
}

export interface IconicItem extends IconicIcon {
    id: string;
    name: string;
    category: 'app' | 'tab' | 'file' | 'folder' | 'group' | 'search' | 'graph' | 'url' | 'tag' | 'property' | 'ribbon' | 'rule';
    iconDefault: string | null;
}

export interface IconicFileItem extends IconicItem {
    items: IconicFileItem[] | null;
}

export interface IconicPlugin extends Plugin {
    getFileItem: (fileId: string, unloading?: boolean) => IconicFileItem;
    ruleManager: {
        checkRuling: (page: IconicRulePage, itemId: string, unloading?: boolean) => IconicRuleItem | null;
    }
    settings: {
        fileIcons: Record<string, { icon: string; color: string }>,
    },
}

// ======================== Graph banner

export interface GraphBannerPlugin extends Plugin {
    graphViews: {
        leaf: WorkspaceLeaf,
        node: Node,
    }[];
}

// ======================== NLP

export interface NLPPlugin extends Plugin {
    Docs: { [path: string]: Document }
    model: WinkMethods
    getDocFromFile: (file: TFile) => Promise<Document>
    getNoStopBoW: (doc: Document, type?: 'tokens' | 'entities') => Bow
    getNoStopSet: (doc: Document, type?: 'tokens' | 'entities') => Set<string>
    getAvgSentimentFromDoc: (
        doc: Document,
        opts?: { perSentence?: boolean; normalised?: boolean }
    ) => number
    settings: { refreshDocsOnLoad: boolean }
    worker: Worker
}