export function colorizeSVG(el: SVGElement, color: string) {
    if (el.getAttr("fill") && el.getAttr("fill") !== "none") {
        el.setAttr("fill", color);
    }
    if (el.getAttr("stroke") && el.getAttr("stroke") !== "none") {
        el.setAttr("stroke", color);
    }
    for (const child of Array.from(el.children)) {
        if (child instanceof SVGElement) {
            colorizeSVG(child, color);
        }
    }
}