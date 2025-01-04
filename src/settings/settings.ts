import { EngineOptions, GraphViewData } from "../views/viewData";
import { DEFAULT_VIEW_ID, LINK_KEY, TAG_KEY } from "../globalVariables";

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
    imageProperty: string;
    maxNodes: number;
    globalFilter: string;
    backupGraphOptions: EngineOptions;
    views: GraphViewData[];

    // Feature toggles
    enableTags: boolean;
    enableProperties: boolean;
    enableLinks: boolean;
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
    imageProperty: "image",
    maxNodes: 20,
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

    // Feature toggles
    enableTags: true,
    enableProperties: false,
    enableLinks: true,
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

DEFAULT_SETTINGS.views[0].disabledTypes[TAG_KEY] = [];
DEFAULT_SETTINGS.views[0].disabledTypes[LINK_KEY] = [];