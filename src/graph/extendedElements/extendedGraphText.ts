
import { GraphNode } from "obsidian-typings";
import { Sprite, Texture, Text, ColorSource, TextStyle } from "pixi.js";
import { getBackgroundColor, getFile, getFileInteractives, GraphInstances, PluginInstances } from "src/internal";

export class ExtendedGraphText {
    textBackground: Sprite | null = null;
    textClone: Text | null = null;
    textProxy: Text | null = null;
    coreElement: GraphNode;
    instances: GraphInstances;
    hasChangedText: boolean = false;

    coreGetTextStyle: () => TextStyle;

    constructor(instances: GraphInstances, coreElement: GraphNode) {
        this.instances = instances;
        this.coreElement = coreElement;
        this.coreGetTextStyle = this.coreElement.getTextStyle.bind(this.coreElement);
        this.restoreText = this.restoreText.bind(this);
        this.changeText = this.changeText.bind(this)
        this.initGraphics();
    }

    initGraphics() {
        this.updateFontFamily();
        this.updateText();
        this.addBackgroundToText();
        this.verticalOffsetText();
    }

    unload(): void {
        PluginInstances.proxysManager.unregisterProxy(this.coreElement.text);
        if (this.coreElement.text && this.hasChangedText) {
            this.restoreText();
            this.coreElement.circle?.removeListener('mouseenter', this.restoreText);
            this.coreElement.circle?.removeListener('mouseleave', this.changeText);
            this.hasChangedText = false;
        }
        if (this.textBackground) {
            this.textBackground.removeFromParent();
            this.textBackground.destroy(true);
            this.textBackground = null;
        }
        if (this.textClone) {
            this.textClone.removeFromParent();
            this.textClone.destroy(true);
            this.textClone = null;
        }
        this.restoreFontFamily();
    }

    disable() {
        if (this.textProxy) {
            PluginInstances.proxysManager.unregisterProxy(this.textProxy);
            this.textProxy = null;
        }
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

    restoreFontFamily(): void {
        this.coreElement.getTextStyle = this.coreGetTextStyle;
        // @ts-ignore
        this.coreElement.fontDirty = true;
    }



    // ================== Change display text

    updateText(): void {
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
        }
    }

    private restoreText() {
        if (!this.coreElement.text) return;
        this.coreElement.text.text = this.coreElement.getDisplayText();
    }



    // ================== Add background behind text

    addBackgroundToText(): void {
        if (!this.coreElement.text) return;
        if (!this.instances.settings.enableFeatures[this.instances.type]['names']
            || !this.instances.settings.addBackgroundToName) return;

        this.textBackground = new Sprite(Texture.WHITE);
        // Clone the text to create a second one
        this.textClone = new Text(this.coreElement.text.text, this.coreElement.getTextStyle());
        // Compute the size
        this.textBackground.width = (this.textClone.getBounds().width + this.textClone.width) / 2;
        this.textBackground.height = (this.textClone.getBounds().height + this.textClone.height) / 2;
        // Set the anchors in the middle, verticaly
        this.textBackground.anchor.set(0.5, 0);
        this.textClone.anchor.set(0.5, 0);
        // Change the color
        this.textBackground.tint = getBackgroundColor(this.coreElement.renderer);
        // Use a higher alpha than 1 in order to have a better opacity (which changes when hovering or zooming in/out)
        this.textBackground.alpha = 2;
        // Add the background and the cloned text to the scene
        this.coreElement.text.addChild(this.textBackground);
        this.coreElement.text.addChild(this.textClone);

        // We need to create a clone text in order to bind the background to the core text element.
        // When we do that, we don't need to worry about transforms applied to the core text
        // but a parent is always behind its children, therefore the background covers the core text
        // Which is why we need to clone it and add the second text as a child too
    }

    updateTextBackgroundColor(backgroundColor: ColorSource): void {
        if (!this.textBackground) return;
        this.textBackground.tint = backgroundColor;
        if (this.textClone && this.coreElement.text) {
            // @ts-ignore
            this.textClone.style.fill = this.coreElement.getTextStyle().fill;
        }
    }



    // ================== Slightly move thex text to avoid overlapping the arrow

    verticalOffsetText(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['names']
            || this.instances.settings.nameVerticalOffset === 0
            || !this.coreElement.text) return;
        const node = this.coreElement;
        if (!node.circle) return;
        const offset = this.instances.settings.nameVerticalOffset;
        const renderer = this.instances.renderer;

        this.textProxy = PluginInstances.proxysManager.registerProxy<typeof this.coreElement.text>(
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
            PluginInstances.proxysManager.unregisterProxy(this.textProxy);
            this.textProxy = null;
        });
    }

}