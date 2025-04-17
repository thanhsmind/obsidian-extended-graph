import { int2rgb, LinkGraphics } from "src/internal";


export class LinkLineGraphics extends LinkGraphics {

    override updateValues(): void {
        super.updateValues();
        this.alpha = this.targetAlpha;
    }

    protected override redraw(): void {
        this.clear();
        this.lineStyle({ width: 16, color: this.color })
            .moveTo(0, 8)
            .lineTo(16, 8);
    }

    override updateFrame(): void { }
}