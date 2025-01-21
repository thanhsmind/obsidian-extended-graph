import { Graphics } from "pixi.js";
import { ManagerGraphics } from "src/graph/abstractAndInterfaces/managerGraphics";
import { InteractiveManager } from "src/graph/interactiveManager";

export abstract class LinkGraphics extends Graphics implements ManagerGraphics {
    // Instance values
    manager: InteractiveManager;
    types: Set<string>;
    name: string;
    targetAlpha: number = 0.6;

    constructor(manager: InteractiveManager, types: Set<string>, name: string) {
        super();
        this.manager = manager;
        this.types = types;
        this.name = name;
    }

    clearGraphics(): void {
        this.clear();
    }

    initGraphics(): void {

    }

    updateGraphics(): void {
        const type = Array.from(this.types.values()).find(t => this.manager.isActive(t));
        if (!type) return;
        this.redrawType(type);
    }

    abstract redrawType(type: string, color?: Uint8Array): void;

    toggleType(type: string, enable: boolean): void {
        this.clear();
        this.updateGraphics();
    }
}