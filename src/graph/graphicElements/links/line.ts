import { InteractiveManager, LinkGraphics, ManagerGraphics } from "src/internal";


export class LinkLineGraphics extends LinkGraphics implements ManagerGraphics {

    constructor(manager: InteractiveManager, types: Set<string>, name: string) {
        super(manager, types, name);

        this.updateGraphics();
    }
    
    redrawType(type: string, color?: Uint8Array): void {
        this.clear();
        this.lineStyle({width: 16, color: color ? color : this.manager.getColor(type)})
            .moveTo(0, 8)
            .lineTo(16, 8);
        this.alpha = this.targetAlpha;
    }
}