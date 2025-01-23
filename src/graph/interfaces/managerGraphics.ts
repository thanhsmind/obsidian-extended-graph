import { InteractiveManager } from "../interactiveManager";

export interface ManagerGraphics {
    manager: InteractiveManager;
    types: Set<string>;
    name: string;

    clearGraphics(): void;
    initGraphics(): void;
    updateGraphics(): void;
    /**
     * Redraws the element representing a given type.
     * @param type The type of the arc
     * @param color The color of the arc
     */
    redrawType(type: string, color?: Uint8Array): void;
    toggleType(type: string, enable: boolean): void;
}