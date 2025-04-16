import { InteractiveManager, LinkGraphicsWrapper, LinkLineGraphics } from "src/internal";


export class LineLinkGraphicsWrapper extends LinkGraphicsWrapper<LinkLineGraphics> {

    // ============================= INITALIZATION =============================

    protected override createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number) {
        const lineLink = new LinkLineGraphics(manager, types, this.name, this.extendedElement);
        this.setManagerGraphics(manager, lineLink);
    }

    // ========================== CONNECT/DISCONNECT ===========================

    override connect(): void {
        if (this.extendedElement.coreElement.line && !this.extendedElement.coreElement.line.getChildByName(this.pixiElement.name)) {
            this.extendedElement.coreElement.line.addChild(this.pixiElement);
        }
    }
}