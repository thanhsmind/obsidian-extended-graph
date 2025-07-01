export const NONE_COLOR: number = 8224125;
export const DEFAULT_STATE_ID: string = "default-vault";

export const TAG_KEY: string = "tag";
export const LINK_KEY: string = "link";
export const FOLDER_KEY: string = "folder";
export const INVALID_KEYS: { [interactive: string]: string[] } = {};
INVALID_KEYS[TAG_KEY] = [];
INVALID_KEYS[LINK_KEY] = ["tags", "file"];
INVALID_KEYS[FOLDER_KEY] = [];


export const t = i18next.getFixedT(null, "extended-graph");