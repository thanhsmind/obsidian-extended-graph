
import { GraphNode } from "obsidian-typings";
import { Sprite, Texture, Text, ColorSource } from "pixi.js";
import { getBackgroundColor, getFile, getFileInteractives, GraphInstances } from "src/internal";

export class ExtendedGraphText {
    textBackground: Sprite | null = null;
    textClone: Text | null = null;
    coreElement: GraphNode;
    instances: GraphInstances;
    originalText: Text | null = null;
    hasChangedText: boolean = false;

    constructor(instances: GraphInstances, coreElement: GraphNode) {
        this.instances = instances;
        this.coreElement = coreElement;

        this.updateFontFamily();
        this.updateText();
        this.addBackgroundToText();
        this.moveTextToAvoidArrow();
    }

    unload(): void {
        if (this.coreElement.text && this.hasChangedText) {
            this.coreElement.text.text = this.coreElement.getDisplayText();
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
        if (this.originalText) {
            this.coreElement.text = this.originalText;
            this.originalText = null;
        }
    }



    // ================== Change font family to match the interface font

    updateFontFamily(): void {
        if (!this.coreElement.text) return;
        const style = window.getComputedStyle(this.coreElement.renderer.interactiveEl);
        const fontInterface = style.getPropertyValue("--font-interface");
        const fontNode = (typeof this.coreElement.text.style.fontFamily === "string")
            ? this.coreElement.text.style.fontFamily
            : this.coreElement.text.style.fontFamily.join(', ');
        if (fontNode !== fontInterface) {
            const textStyle = this.coreElement.text.style;
            textStyle.fontFamily = fontInterface;
            this.coreElement.text.style = textStyle;
        }
    }



    // ================== Change display text

    updateText(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['names'] || !this.coreElement.text || this.hasChangedText) return;

        let text = this.coreElement.text.text;

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
            this.hasChangedText = true;
            this.coreElement.text.text = text;
        }
    }



    // ================== Add background behind text

    addBackgroundToText(): void {
        if (!this.coreElement.text) return;
        if (!this.instances.settings.enableFeatures[this.instances.type]['names']
            || !this.instances.settings.addBackgroundToName) return;
        this.textBackground = new Sprite(Texture.WHITE);
        this.textBackground.width = (this.coreElement.text.getBounds().width + this.coreElement.text.width) / 2;
        this.textBackground.height = (this.coreElement.text.getBounds().height + this.coreElement.text.height) / 2;
        this.textBackground.anchor.set(0.5, 0);
        this.textBackground.tint = getBackgroundColor(this.coreElement.renderer);
        this.textBackground.alpha = 2;
        this.textClone = new Text(this.coreElement.text.text, this.coreElement.text.style);
        this.textClone.anchor.set(0.5, 0);
        this.coreElement.text.addChild(this.textBackground);
        this.coreElement.text.addChild(this.textClone);
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

    moveTextToAvoidArrow(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['names']
            || this.instances.settings.nameVerticalOffset === 0
            || !this.coreElement.text || this.originalText) return;
        this.originalText = this.coreElement.text;
        const offset = this.instances.settings.nameVerticalOffset;
        this.coreElement.text = new Proxy(this.coreElement.text, {
            set(target, prop, value, receiver) {
                if (prop === "y") {
                    target.y = value + offset;
                }
                else {
                    // @ts-ignore
                    target[prop] = value;
                }
                return true;
            }
        })
    }

}