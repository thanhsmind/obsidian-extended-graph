import { Plugin, WorkspaceLeaf } from "obsidian";

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

export interface IconicPlugin extends Plugin {
    settings: {
        fileIcons: Record<string, { icon: string; color: string }>,
    }
}

export interface GraphBannerPlugin extends Plugin {
    graphViews: {
        leaf: WorkspaceLeaf,
        node: Node,
    }[];
}