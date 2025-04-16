export function getSVGNode(n: string, v?: any): SVGElement {
    const svgNode = document.createElementNS("http://www.w3.org/2000/svg", n);
    for (const p in v)
        svgNode.setAttributeNS(null, p.replace(/[A-Z]/g, function (m, p, o, s) { return "-" + m.toLowerCase(); }), v[p]);
    return svgNode;
}