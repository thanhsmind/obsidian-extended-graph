
import { GraphNode } from "obsidian-typings";
import { TextStyle } from "pixi.js";
import { getFile, getFileInteractives, GraphInstances, PluginInstances, TextGraphicsWrapper } from "src/internal";

export class ExtendedGraphText {
    coreElement: GraphNode;
    instances: GraphInstances;
    hasChangedText: boolean = false;
    graphicsWrapper?: TextGraphicsWrapper;

    coreGetTextStyle: () => TextStyle;

    constructor(instances: GraphInstances, coreElement: GraphNode) {
        this.instances = instances;
        this.coreElement = coreElement;
        this.coreGetTextStyle = this.coreElement.getTextStyle.bind(this.coreElement);
        this.restoreText = this.restoreText.bind(this);
        this.changeText = this.changeText.bind(this);
        this.modifyCoreElement();
        this.createGraphicsWrapper();
    }

    init() {
        this.graphicsWrapper?.connect();
        this.modifyCoreElement();
    }

    modifyCoreElement() {
        this.updateFontFamily();
        this.updateText();
        this.proxyText();
    }

    unload(): void {
        PluginInstances.proxysManager.unregisterProxy(this.coreElement.text);
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
        PluginInstances.proxysManager.unregisterProxy(this.coreElement.text);
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



    // ================== Slightly move thex text to avoid overlapping the arrow

    private proxyText(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['names']
            || this.instances.settings.nameVerticalOffset === 0
            || !this.coreElement.text) return;
        const node = this.coreElement;
        if (!node.circle) return;
        const offset = this.instances.settings.nameVerticalOffset;
        const renderer = this.instances.renderer;

        PluginInstances.proxysManager.registerProxy<typeof this.coreElement.text>(
            this.coreElement,
            "text",
            {
                set(target, prop, value, receiver) {
                    if (prop === "y") {
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
                            const nodeFactor = size * renderer.nodeScale / 50 + target.height / 100;
                            const newOffset = -5 * renderer.nodeScale + ((5 + offset) * nodeFactor);
                            value = value + newOffset;
                        }
                        else if (offset <= -105) {
                            const nodeFactor = size * renderer.nodeScale / 50 + target.height / 100;
                            const newOffset = (100 + offset) * renderer.nodeScale + (-100 * nodeFactor);
                            value = value + newOffset;
                        }
                        else {
                            value = value + offset * renderer.nodeScale;
                        }
                    }

                    return Reflect.set(target, prop, value, receiver);
                }
            }
        );

        this.coreElement.text.addListener('destroyed', () => {
            PluginInstances.proxysManager.unregisterProxy(typeof this.coreElement.text);
        });
    }

}