import { Graphics } from "pixi.js";
import { ManagerGraphics } from "src/graph/abstractAndInterfaces/managerGraphics";
import { InteractiveManager } from "src/graph/interactiveManager";

export class LineLink extends Graphics implements ManagerGraphics {
    // Instance values
    manager: InteractiveManager;
    types: Set<string>;
    

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

    redrawType(type: string, color?: Uint8Array): void {
        this.clear();
        this.lineStyle({width: 16, color: this.manager.getColor(type)})
            .moveTo(0, 8)
            .lineTo(16, 8);
        this.alpha = 0.6;
    }

    toggleType(type: string, enable: boolean): void {
        this.clear();
        this.updateGraphics();
    }
}