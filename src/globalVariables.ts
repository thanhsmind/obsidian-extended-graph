export const NONE_COLOR: Uint8Array = new Uint8Array([125, 125, 125]);
export const DEFAULT_VIEW_ID: string = "default-vault";

export const TAG_KEY: string = "tag";
export const LINK_KEY: string = "link";
export const FOLDER_KEY: string = "folder";
export const INVALID_KEYS: {[interactive: string]: string[]} = {};
INVALID_KEYS[TAG_KEY] = [];
INVALID_KEYS[LINK_KEY] = ["tags", "file"];
INVALID_KEYS[FOLDER_KEY] = [];

export const DisconnectionCause = Object.freeze({
    USER: "user",
    ORPHAN: "orphan",
});

export const BUTTON_DELETE_CLASS: string = "extended-graph-delete-button";
export const BUTTON_ADD_CLASS: string    = "extended-graph-add-button";