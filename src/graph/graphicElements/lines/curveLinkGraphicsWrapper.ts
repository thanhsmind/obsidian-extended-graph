import { LinkGraphicsWrapper } from "src/graph/abstractAndInterfaces/linkGraphicsWrapper";
import { LinkCurveGraphics } from "./curve";
import { InteractiveManager } from "src/graph/interactiveManager";

export class CurveLinkGraphicsWrapper extends LinkGraphicsWrapper<LinkCurveGraphics> {
    
    // ============================= INITALIZATION =============================
    
    override createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number) {
        const curveLink = new LinkCurveGraphics(manager, types, this.name, this.extendedElement.coreElement);
        this.setManagerGraphics(manager, curveLink);
    }

    // ========================== CONNECT/DISCONNECT ===========================

    override connect(): void {
        if (this.extendedElement.coreElement.px && !this.extendedElement.coreElement.px.getChildByName(this.pixiElement.name)) {
            this.extendedElement.coreElement.px.addChild(this.pixiElement);
        }
    }
}