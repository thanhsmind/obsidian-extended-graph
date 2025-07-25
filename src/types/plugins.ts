import { Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { Bow, WinkMethods } from "wink-nlp";

// ======================== Iconize

export interface IconizePlugin extends Plugin {
    api: {
        util: {
            dom: {
                getIconNodeFromPath: (path: string) => HTMLElement;
            }
        }
    },
    data: Record<string, { iconColor: string }>
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