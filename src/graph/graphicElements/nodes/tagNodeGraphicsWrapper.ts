import { ExtendedGraphTagNode, InteractiveManager, NodeGraphicsWrapper } from "src/internal";


export class TagNodeGraphicsWrapper extends NodeGraphicsWrapper {
    // Interface instance values
    extendedElement: ExtendedGraphTagNode;

    // ============================= INITALIZATION =============================

    createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number): void {
        
    }

    resetManagerGraphics(manager: InteractiveManager): void {
        
    }
}