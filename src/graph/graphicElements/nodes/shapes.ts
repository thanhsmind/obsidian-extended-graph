import { ColorSource, Graphics, SHAPES } from "pixi.js";

export enum ShapeEnum {
    CIRCLE = "circle",
    POLY_3 = "triangle",
    POLY_4 = "diamond",
    POLY_5 = "pentagon",
    POLY_6 = "hexagon",
    POLY_8 = "octogon",
    POLY_10 = "decagon",
    STARBURST_4 = "staburst 4",
    STARBURST_5 = "staburst 5",
    STARBURST_6 = "starburst 6",
    STARBURST_8 = "staburst 8",
    STARBURST_10 = "staburst 10"
}

enum ShapeType {
    CIRCLE = "circle",
    POLYGON = "polygon",
    STARBURST = "starburst",
    UNKNOWN = "unknown"
}

const NODE_RADIUS = 100;
const RESOLUTION_RADIUS = 10;

export class NodeShape extends Graphics {
    readonly shape: ShapeEnum;
    readonly n: number;
    readonly type: ShapeType;

    constructor(shape: ShapeEnum) {
        super();
        this.shape = shape;
        this.n = NodeShape.getN(shape);
        this.type = NodeShape.getType(shape);
    }

    drawMask(): NodeShape {
        return this.drawFill(0xFFFFFF);
    }

    drawFill(color: ColorSource): NodeShape {
        return this.beginFill(color)
                   .drawUniqueShape()
                   .endFill();
    }

    getDrawingResolution() {
        if (this.type === ShapeType.CIRCLE) {
            return RESOLUTION_RADIUS;
        }
        return 1;
    }

    // https://bennettfeely.com/clippy/
    // starburst: https://css-generators.com/starburst-shape/
    // polygon: https://css-generators.com/polygon-shape/
    private drawUniqueShape(): NodeShape {
        if (this.type === ShapeType.POLYGON) {
            return this.drawPolygon(this.getPolygonOutside());
        }
        if (this.type === ShapeType.STARBURST) {
            return this.drawPolygon(this.getStarburst());
        }
        switch (this.shape) {
            case ShapeEnum.CIRCLE:
                return this.drawCircle(0, 0, RESOLUTION_RADIUS);
            default:
                return this;
        }
    }

    private getPolygonInside(shift: number, r: number = NODE_RADIUS): number[] {
        const P: number[] = [];
        for (let k = 0; k < this.n; ++k) {
            const theta = 2 * Math.PI * k / this.n;
            P.push(r *  Math.sin(theta + shift));
            P.push(r * -Math.cos(theta + shift));
        }
        return P;
    }

    private getPolygonOutside(): number[] {
        let newRadius = NODE_RADIUS;
        if (this.type === ShapeType.POLYGON) {
            newRadius = NodeShape.getPolygonRadius(this.n);
        }
        if (this.type === ShapeType.STARBURST) {
            newRadius = NodeShape.getStarburstRadius(this.n);
        }
        return this.getPolygonInside(0, newRadius);
    }

    private getStarburst(): number[] {
        const Pi = this.getPolygonInside(2 * Math.PI / (2 * this.n));
        const Po = this.getPolygonOutside();
        const P: number[] = [];
        for (let k = 0; k < this.n; ++k) {
            P.push(Po[k*2]);
            P.push(Po[k*2+1]);
            P.push(Pi[k*2]);
            P.push(Pi[k*2+1]);
        }
        console.log(P);
        return P;
    }

    // ============================ STATIC METHODS =============================

    static nodeScaleFactor(shape: ShapeEnum): number {
        const type = NodeShape.getType(shape);
        if (type === ShapeType.POLYGON) {
            const outerR = NodeShape.getPolygonRadius(NodeShape.getN(shape));
            const innerR = NODE_RADIUS;
            const middleR = (outerR + innerR) / 2;
            return middleR / outerR;
        }
        if (type === ShapeType.STARBURST) {
            const outerR = NodeShape.getStarburstRadius(NodeShape.getN(shape));
            const innerR = NODE_RADIUS;
            const middleR = (outerR + innerR) / 2;
            return middleR / outerR;
        }
        return 1;
    }

    static getSizeFactor(shape: ShapeEnum): number {
        const type = NodeShape.getType(shape);
        if (type === ShapeType.POLYGON) {
            return this.getPolygonRadius(NodeShape.getN(shape)) / NODE_RADIUS;
        }
        if (type === ShapeType.STARBURST) {
            return this.getStarburstRadius(NodeShape.getN(shape)) / NODE_RADIUS;
        }
        return 1;
    }

    static randomShape(): ShapeEnum {
        const values = Object.keys(ShapeEnum).filter(v => typeof v === 'string');
        const enumKey = values[Math.floor(Math.random() * values.length)];
        return ShapeEnum[enumKey as keyof typeof ShapeEnum];
    }

    private static getN(shape: ShapeEnum): number {
        switch (shape) {
            case ShapeEnum.POLY_3:
                return 3;
            case ShapeEnum.POLY_4:
            case ShapeEnum.STARBURST_4:
                return 4;
            case ShapeEnum.POLY_5:
            case ShapeEnum.STARBURST_5:
                return 5;
            case ShapeEnum.POLY_6:
            case ShapeEnum.STARBURST_6:
                return 6;
            case ShapeEnum.POLY_8:
            case ShapeEnum.STARBURST_8:
                return 8;
            case ShapeEnum.POLY_10:
            case ShapeEnum.STARBURST_10:
                return 10;
            case ShapeEnum.CIRCLE:
                return 10;
            default:
                return 0;
        }
    }

    private static getType(shape: ShapeEnum): ShapeType {
        switch (shape) {
            case ShapeEnum.POLY_3:
            case ShapeEnum.POLY_4:
            case ShapeEnum.POLY_5:
            case ShapeEnum.POLY_6:
            case ShapeEnum.POLY_8:
            case ShapeEnum.POLY_10:
                return ShapeType.POLYGON;
            case ShapeEnum.STARBURST_4:
            case ShapeEnum.STARBURST_5:
            case ShapeEnum.STARBURST_6:
            case ShapeEnum.STARBURST_8:
            case ShapeEnum.STARBURST_10:
                return ShapeType.STARBURST;
            case ShapeEnum.CIRCLE:
                return ShapeType.CIRCLE;
            default:
                return ShapeType.UNKNOWN
        }
    }

    private static getPolygonRadius(n: number): number {
        const rInside = NODE_RADIUS;
        const rOutside = rInside / Math.cos(Math.PI / n);
        return rOutside;
    }
    
    private static getStarburstRadius(n: number): number {
        return NodeShape.getPolygonRadius(n) + 30;
    }
}