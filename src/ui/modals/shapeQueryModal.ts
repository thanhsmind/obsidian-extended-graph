import { NodeShape, NodesQueryModal, QueryData, ShapeEnum } from "src/internal";
import STRINGS from "src/Strings";

export class ShapeQueryModal extends NodesQueryModal {
    saveShapeQueryCallback: (shape: ShapeEnum, queryData: QueryData) => void;
    shape: ShapeEnum;

    constructor(shape: ShapeEnum, queryData: QueryData, saveShapeQueryCallback: (shape: ShapeEnum, queryData: QueryData) => void) {
        super(STRINGS.query.setShapeQueryFor + ": " + STRINGS.features.shapesNames[shape],
            queryData,
            (queryData) => { this.saveShapeQueryCallback(this.shape, queryData); }
        );
        this.saveShapeQueryCallback = saveShapeQueryCallback;
        this.shape = shape;
    }

    override onOpen() {
        this.addShapeIcon();
        super.onOpen();
    }

    private addShapeIcon() {
        const svg = NodeShape.getSVG(this.shape);
        svg.addClass("shape-svg");
        this.titleEl.insertAdjacentElement('afterbegin', svg);
    }
}


