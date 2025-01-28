import { InteractiveManager, LinkCurveGraphics, LinkGraphicsWrapper } from "src/internal";


export class CurveLinkGraphicsWrapper extends LinkGraphicsWrapper<LinkCurveGraphics> {
    
    // ============================= INITALIZATION =============================
    
    override createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number) {
        const curveLink = new LinkCurveGraphics(manager, types, this.name, this.extendedElement);
        this.setManagerGraphics(manager, curveLink);
    }

    // ========================== CONNECT/DISCONNECT ===========================

    override connect(): void {
        const hanger = this.extendedElement.coreElement.renderer.hanger;
        if (!hanger.getChildByName(this.pixiElement.name)) {
            this.pixiElement.extendedLink = this.extendedElement;
            hanger.addChild(this.pixiElement);
        }
    }
}