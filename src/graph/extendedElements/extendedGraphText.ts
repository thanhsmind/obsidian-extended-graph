
import { GraphNode } from "obsidian-typings";
import { TextStyle } from "pixi.js";
import { getFile, getFileInteractives, GraphInstances, PluginInstances, TextGraphicsWrapper } from "src/internal";

export class ExtendedGraphText {
    coreElement: GraphNode;
    instances: GraphInstances;
    hasChangedText: boolean = false;
    graphicsWrapper?: TextGraphicsWrapper;
    coreTextPositionCallback: (() => void) | undefined;

    coreGetTextStyle: () => TextStyle;

    constructor(instances: GraphInstances, coreElement: GraphNode) {
        this.instances = instances;
        this.coreElement = coreElement;
        this.coreGetTextStyle = this.coreElement.getTextStyle.bind(this.coreElement);
        this.restoreText = this.restoreText.bind(this);
        this.changeText = this.changeText.bind(this);
    }

    init() {
        this.modifyCoreElement();
        this.createGraphicsWrapper();
        this.graphicsWrapper?.connect();
        this.coreElement.text?.addListener('destroyed', () => {
            this.unload();
        });
    }

    modifyCoreElement() {
        this.updateFontFamily();
        this.updateText();
        this.createTextPositionCallback();
    }

    unload(): void {
        this.restoreTextPositionCallback();
        if (this.coreElement.text && this.hasChangedText) {
            this.restoreText();
            this.coreElement.circle?.removeListener('mouseenter', this.restoreText);
            this.coreElement.circle?.removeListener('mouseleave', this.changeText);
            this.hasChangedText = false;
        }
        this.graphicsWrapper?.destroyGraphics();
        this.restoreFontFamily();
    }

    disable() {
        this.restoreTextPositionCallback();
    }

    // ================== Change font family to match the interface font

    updateFontFamily(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['names'] || !this.instances.settings.useInterfaceFont || !this.coreElement.text) return;
        const style = window.getComputedStyle(this.coreElement.renderer.interactiveEl);
        const fontInterface = style.getPropertyValue("--font-interface");
        const fontNode = (typeof this.coreElement.text.style.fontFamily === "string")
            ? this.coreElement.text.style.fontFamily
            : this.coreElement.text.style.fontFamily.join(', ');
        if (fontNode !== fontInterface) {
            this.coreElement.getTextStyle = () => {
                const coreStyle = this.coreGetTextStyle();
                coreStyle.fontFamily = fontInterface + ", " + fontNode;
                return coreStyle;
            }
            // @ts-ignore
            this.coreElement.fontDirty = true;
        }
    }

    private restoreFontFamily(): void {
        this.coreElement.getTextStyle = this.coreGetTextStyle;
        // @ts-ignore
        this.coreElement.fontDirty = true;
    }



    // ================== Change display text

    private updateText(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['names'] || !this.coreElement.text) return;

        this.coreElement.circle?.addListener('mouseenter', this.restoreText);
        this.coreElement.circle?.addListener('mouseleave', this.changeText);

        this.hasChangedText = true;

        this.changeText();
    }

    private changeText() {
        if (!this.coreElement.text) return;

        let text = this.coreElement.getDisplayText();

        if (this.instances.settings.usePropertyForName) {
            const file = getFile(this.coreElement.id);
            if (file) {
                const values = getFileInteractives(this.instances.settings.usePropertyForName, file);
                for (const value of values) {
                    if (value !== undefined && value !== null) {
                        text = value.toString();
                        break;
                    }
                }
            }
        }

        if (this.instances.settings.showOnlyFileName) {
            text = text.split("/").last() || text;
        }

        if (this.instances.settings.noExtension) {
            text = text.replace(/\.[^/.]+$/, "");
        }

        if (this.instances.settings.numberOfCharacters && this.instances.settings.numberOfCharacters > 0) {
            text = text.slice(0, this.instances.settings.numberOfCharacters);
        }

        if (text !== this.coreElement.text.text) {
            this.coreElement.text.text = text;
            this.graphicsWrapper?.updateBackgroundAfterTextChange();
        }
    }

    private restoreText() {
        if (!this.coreElement.text) return;
        const newText = this.coreElement.getDisplayText();
        if (this.coreElement.text.text !== newText) {
            this.coreElement.text.text = this.coreElement.getDisplayText();
            this.graphicsWrapper?.updateBackgroundAfterTextChange();
        }
    }



    // ================== Add background behind text

    createGraphicsWrapper(): void {
        if (!this.coreElement.text) return;
        if (!this.instances.settings.enableFeatures[this.instances.type]['names']
            || !this.instances.settings.addBackgroundToName) return;

        if (!this.graphicsWrapper) {
            this.graphicsWrapper = new TextGraphicsWrapper(this);
        }
        this.graphicsWrapper.createGraphics();
    }



    // ================== Slightly move the text to avoid overlapping the arrow

    private createTextPositionCallback(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['names']
            || (this.instances.settings.nameVerticalOffset === 0 && !this.instances.settings.dynamicVerticalOffset)) return;
        if (!this.coreElement.text) return;

        const position = this.coreElement.text.position;
        const applyOffset = this.instances.settings.dynamicVerticalOffset ? this.applyDynamicOffset.bind(this) : this.applyStaticOffset.bind(this);
        this.coreTextPositionCallback = position.cb;
        const coreTextPositionCallback = position.cb;
        position.cb = () => {
            applyOffset();
            coreTextPositionCallback.call(position.scope);
        }
        // @ts-ignore
        this.coreElement.moveText = true;
    }

    private restoreTextPositionCallback(): void {
        if (!this.coreTextPositionCallback) return;

        const position = this.coreElement.text?.position;
        if (position) {
            position.cb = this.coreTextPositionCallback;
            this.coreTextPositionCallback = undefined;
        }
    }

    private applyDynamicOffset(): void {
        const node = this.coreElement;
        if (!node.text || !node.circle) return;
        const renderer = this.instances.renderer;
        let value = node.text.y;
        const arrowFixedSize = this.instances.settings.enableFeatures[this.instances.type]['arrows'] && this.instances.settings.arrowFixedSize;
        const arrowCustomScale = this.instances.settings.enableFeatures[this.instances.type]['arrows'] ? this.instances.settings.arrowScale : 1;

        const scale = 2 * Math.sqrt(renderer.fLineSizeMult)
            * (arrowFixedSize ? renderer.nodeScale : 1 / renderer.scale)
            * arrowCustomScale;
        // 5 is the original offset of the core plugin
        // 4 is the size/height of the arrow
        value = value - 5 + 4 * arrowCustomScale * scale;
        node.text.position._y = value;
    }

    private applyStaticOffset(): void {
        const node = this.coreElement;
        if (!node.text || !node.circle) return;
        const offset = this.instances.settings.nameVerticalOffset;
        const renderer = this.instances.renderer;
        let value = node.text.y;
        const size = node.getSize();
        // if the offset places the text above the center of the node
        // we need to inverse the value when hovered (text moving)
        if (offset < -55) {
            const origin = node.y + (size + 5) * renderer.nodeScale;
            const move = value - origin;
            value = origin - move;
        }
        // if the offset is negative, we need to modify the offset
        // to take in account the node size
        if (offset < -5 && offset > -105) {
            const nodeFactor = size * renderer.nodeScale / 50 + node.text.height / 100;
            const newOffset = -5 * renderer.nodeScale + ((5 + offset) * nodeFactor);
            value = value + newOffset;
        }
        else if (offset <= -105) {
            const nodeFactor = size * renderer.nodeScale / 50 + node.text.height / 100;
            const newOffset = (100 + offset) * renderer.nodeScale + (-100 * nodeFactor);
            value = value + newOffset;
        }
        else {
            value = value + offset * renderer.nodeScale;
        }
        node.text.position._y = value;
    }

}