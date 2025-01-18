import { EngineOptions, GraphViewData } from "../views/viewData";
import { DEFAULT_VIEW_ID, FOLDER_KEY, LINK_KEY, TAG_KEY } from "../globalVariables";

interface InteractiveSettings {
    colormap: string;
    colors: {type: string, color: string}[];
    unselected: string[];
    noneType: string;
}

export interface ExtendedGraphSettings {
    // Interactive settings
    interactiveSettings: { [interactive: string] : InteractiveSettings };
    additionalProperties: { [interactive: string] : boolean };

    // Graph settings
    globalFilter: string;
    backupGraphOptions: EngineOptions;
    views: GraphViewData[];

    // Image
    imageProperty: string;
    borderFactor: number;

    // Performances
    maxNodes: number;
    delay: number;

    // Feature toggles
    enableTags: boolean;
    enableProperties: boolean;
    enableLinks: boolean;
    enableFolders: boolean;
    enableImages: boolean;
    enableFocusActiveNote: boolean;
    removeSource: boolean;
    removeTarget: boolean;

    // Display settings
    fadeOnDisable: boolean;
    focusScaleFactor: number;

    // Internal settings (not set by the user)
    collapseView: boolean;
    collapseLegend: boolean;
}

export const DEFAULT_SETTINGS: ExtendedGraphSettings = {
    // Interactive settings
    interactiveSettings: {},
    additionalProperties: {},
    
    // Graph settings
    globalFilter: "",
    backupGraphOptions: new EngineOptions(),
    views: [
        {
            id: DEFAULT_VIEW_ID,
            name: "Vault (default)",
            engineOptions: new EngineOptions(),
            disabledTypes: { }
        }
    ],

    // Images
    imageProperty: "image",
    borderFactor: 0.06,

    // Performances
    maxNodes: 20,
    delay: 500,

    // Feature toggles
    enableTags: true,
    enableProperties: false,
    enableLinks: true,
    enableFolders: true,
    enableImages: true,
    enableFocusActiveNote: false,
    removeSource: false,
    removeTarget: false,

    // Display settings
    fadeOnDisable: false,
    focusScaleFactor: 1.8,

    // Internal settings (not set by the user)
    collapseView: true,
    collapseLegend: true,
};

DEFAULT_SETTINGS.interactiveSettings[TAG_KEY] = {
    colormap: "hsv",
    colors: [],
    unselected: [],
    noneType: "none"
};

DEFAULT_SETTINGS.interactiveSettings[LINK_KEY] = {
    colormap: "rainbow",
    colors: [],
    unselected: [],
    noneType: "none"
};

DEFAULT_SETTINGS.interactiveSettings[FOLDER_KEY] = {
    colormap: "winter",
    colors: [],
    unselected: [],
    noneType: "."
};