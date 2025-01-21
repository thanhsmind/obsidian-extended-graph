import { EngineOptions, GraphViewData } from "../views/viewData";
import { DEFAULT_VIEW_ID, FOLDER_KEY, LINK_KEY, TAG_KEY } from "../globalVariables";
import { ShapeEnum } from "src/graph/graphicElements/nodes/shapes";
import { QueryData } from "src/queries/queriesMatcher";
import { Feature } from "src/types/features";

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
    enableFeatures: Record<Feature, boolean>;

    // Shapes
    shapeQueries: Record<string, QueryData>;

    // Display settings
    fadeOnDisable: boolean;
    focusScaleFactor: number;

    // Internal settings (not set by the user)
    collapseView: boolean;
    collapseLegend: boolean;
}

let shapeQueriesIndex = 0;
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
    enableFeatures: {
        'tags'        : true,
        'properties'  : false,
        'property-key': true,
        'links'       : true,
        'curvedLinks' : false,
        'folders'     : false,
        'images'      : true,
        'focus'       : false,
        'shapes'      : true,
        'source'      : false,
        'target'      : false,
    },

    // Shapes
    shapeQueries: {
        'circle'   : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'square'   : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'triangle' : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'diamond'  : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'pentagon' : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'hexagon'  : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'octogon'  : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'decagon'  : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'star (4)' : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'star (5)' : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'star (6)' : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'star (8)' : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'star (10)': {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
    },

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