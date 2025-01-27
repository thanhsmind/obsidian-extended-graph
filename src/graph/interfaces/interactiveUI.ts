export interface InteractiveUI {
    update: (key: string, type: string, color: Uint8Array) => void;
    add: (key: string, type: string, color: Uint8Array) => void;
    remove: (key: string, types: string[]) => void;
    toggle: (key: string, type: string) => void;
    disableUI: (key: string, type: string) => void;
    enableUI: (key: string, type: string) => void;
    enableAllUI: (key: string) => void;
    disableAllUI: (key: string) => void;
}