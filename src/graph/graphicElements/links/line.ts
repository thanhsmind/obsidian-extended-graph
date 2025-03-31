import { ExtendedGraphLink, InteractiveManager, LinkGraphics, ManagerGraphics } from "src/internal";


export class LinkLineGraphics extends LinkGraphics {

    constructor(manager: InteractiveManager, types: Set<string>, name: string, extendedLink: ExtendedGraphLink) {
        super(manager, types, name, extendedLink);

        this.initGraphics();
        this.updateGraphics();
    }

    initGraphics(): void {
        super.initGraphics();
        this.alpha = this.targetAlpha;
        if (!this.extendedLink.coreElement.px) return;
    }

    redrawType(type: string, color?: Uint8Array): void {
        super.redrawType(type, color);

        this.clear();
        this.lineStyle({ width: 16, color: this.color })
            .moveTo(0, 8)
            .lineTo(16, 8);
    }

    override updateFrame(): void {
        console.log("updateFrame");
        this.extendedLink.coreElement.arrow?.position.set(100, 0);
    }
}