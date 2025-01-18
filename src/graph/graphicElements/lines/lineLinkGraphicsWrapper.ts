import { ExtendedGraphLink } from "src/graph/extendedElements/extendedGraphLink";
import { LinkGraphicsWrapper } from "../../abstractAndInterfaces/linkGraphicsWrapper";
import { LineLink } from "./line";
import { InteractiveManager } from "src/graph/interactiveManager";




export class LineLinkGraphicsWrapper extends LinkGraphicsWrapper {
    // Interface instance values
    managerGraphicsMap?: Map<string, LineLink>;
    pixiElement: LineLink;

    constructor(extendedElement: ExtendedGraphLink) {
        super(extendedElement);
    }


    // ============================= INITALIZATION =============================

    initGraphics(): void {
        this.managerGraphicsMap = new Map<string, LineLink>();
    }
    
    override createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number) {
        const lineLink = new LineLink(manager, types, this.name);
        this.managerGraphicsMap?.set(manager.name, lineLink);
        this.pixiElement = lineLink;
        this.connect();
    }

    // ============================ CLEAR GRAPHICS =============================

    clearGraphics(): void {
        this.pixiElement.clear();
    }

    // ============================ UPDATE GRAPHICS ============================

    updateGraphics(): void {
        this.pixiElement.updateGraphics();
    }

    // ============================ ENABLE/DISABLE =============================

    toggleType(type: string, enable: boolean): void {
        throw new Error('Method not implemented.');
    }

    // ========================== CONNECT/DISCONNECT ===========================

    connect(): void {
        if (this.extendedElement.coreElement.line && !this.extendedElement.coreElement.line.getChildByName(this.pixiElement.name)) {
            this.extendedElement.coreElement.line.addChild(this.pixiElement);
        }
    }
}