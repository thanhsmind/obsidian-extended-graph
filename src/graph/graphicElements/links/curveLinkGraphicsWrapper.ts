import { InteractiveManager, LinkCurveGraphics, LinkGraphicsWrapper } from "src/internal";


export class CurveLinkGraphicsWrapper extends LinkGraphicsWrapper<LinkCurveGraphics> {

    // ============================= INITALIZATION =============================

    protected override createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number) {
        const existingLinkGraphics = this.managerGraphicsMap.get(manager.name);
        if (existingLinkGraphics && !existingLinkGraphics.destroyed) {
            this.setManagerGraphics(manager, existingLinkGraphics);
        }
        else {
            const curveLink = new LinkCurveGraphics(manager, types, this.name, this.extendedElement);
            this.setManagerGraphics(manager, curveLink);
        }
    }

    // ========================== CONNECT/DISCONNECT ===========================

    override connect(): void {
        const hanger = this.extendedElement.coreElement.renderer.hanger;
        if (!hanger.getChildByName(this.pixiElement.name)) {
            this.pixiElement.extendedLink = this.extendedElement;
            if (this.extendedElement.coreElement.arrow) this.extendedElement.coreElement.arrow.renderable = false;
            hanger.addChild(this.pixiElement);
        }
    }
}