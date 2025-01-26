import { InteractiveManager, LinkCurveGraphics, LinkGraphicsWrapper } from "src/internal";


export class CurveLinkGraphicsWrapper extends LinkGraphicsWrapper<LinkCurveGraphics> {
    
    // ============================= INITALIZATION =============================
    
    override createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number) {
        const curveLink = new LinkCurveGraphics(manager, types, this.name, this.extendedElement.coreElement);
        this.setManagerGraphics(manager, curveLink);
    }

    // ========================== CONNECT/DISCONNECT ===========================

    override connect(): void {
        if (this.extendedElement.coreElement.px && !this.extendedElement.coreElement.px.getChildByName(this.pixiElement.name)) {
            this.pixiElement.link = this.extendedElement.coreElement;
            this.extendedElement.coreElement.px.addChild(this.pixiElement);
        }
    }
}