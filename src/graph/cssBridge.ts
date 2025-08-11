import { Component } from "obsidian";
import { GraphColorAttributes, GraphRenderer } from "obsidian-typings";
import { TextStyleFill, TextStyleFontStyle, TextStyleFontVariant, TextStyleFontWeight } from "pixi.js";
import path from "path";
import { ExtendedGraphInstances, GraphInstances } from "src/pluginInstances";
import * as Color from 'src/colors/color-bits';

export interface CSSTextStyle {
    fontFamily: string;
    fontSize: number;
    fontStyle: TextStyleFontStyle;
    fontVariant: TextStyleFontVariant;
    fontWeight: TextStyleFontWeight;
    letterSpacing: number;
    fill?: TextStyleFill;
}

// ============================== Folder Style ============================== //

export interface CSSFolderTextStyle {
    textStyle: CSSTextStyle;
    align: 'left' | 'center' | 'right';
}

export interface CSSFolderStyle {
    textStyle: CSSFolderTextStyle;
    radius: number;
    borderWidth: number;
    fillOpacity: number;
    strokeOpacity: number;
    padding: { left: number, top: number, right: number, bottom: number };
}
// ============================ Link Label Style ============================ //

export interface CSSLinkLabelStyle {
    textStyle: CSSTextStyle,
    radius: number;
    borderWidth: number;
    borderColor: GraphColorAttributes;
    padding: { left: number, top: number, right: number, bottom: number };
    backgroundColor: GraphColorAttributes;
}

// ==================== Creation of the <style> elements ==================== //

const cssDivId = "extended-graph-css-div";

export class CSSBridge extends Component {
    instances: GraphInstances;

    // =========================== DEFAULT STYLES =========================== //

    static DEFAULT_TEXT_STYLE: CSSTextStyle = {
        fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Microsoft YaHei Light", sans-serif',
        fontSize: 14,
        fontStyle: 'normal',
        fontVariant: 'normal',
        fontWeight: 'normal',
        letterSpacing: 0
    }

    static DEFAULT_FOLDER_STYLE: CSSFolderStyle = {
        textStyle: {
            textStyle: CSSBridge.DEFAULT_TEXT_STYLE,
            align: 'center',
        },
        radius: 50,
        borderWidth: 2,
        fillOpacity: 0.03,
        strokeOpacity: 0.03 * 15,
        padding: { left: 0, top: 0, right: 0, bottom: 0 },
    }

    static DEFAULT_LINK_LABEL_STYLE: CSSLinkLabelStyle = {
        textStyle: CSSBridge.DEFAULT_TEXT_STYLE,
        radius: 0,
        borderWidth: 0,
        padding: { left: 0, top: 0, right: 0, bottom: 0 },
        borderColor: { rgb: 0, a: 0 },
        backgroundColor: { rgb: 0, a: 0 }
    }

    // ============================ CONSTRUCTOR ============================= //

    constructor(instances: GraphInstances) {
        super();
        this.instances = instances;
    }

    // ================================ LOAD ================================ //

    override onload(): void {
        CSSBridge.computeBackgroundColor(this.instances.renderer);
        this.createStyleElementsForCSSBridge();
    }

    private createStyleElementsForCSSBridge(): void {
        if (!this.instances.settings.enableCSS) return;
        if (!ExtendedGraphInstances.app.customCss.enabledSnippets.has(ExtendedGraphInstances.settings.cssSnippetFilename)) return;

        // Get the document inside the iframe
        const doc = this.instances.renderer.iframeEl.contentDocument;
        if (!doc) return;

        // Remove existing styling, just in case
        this.removeStylingForCSSBridge();

        // Add the styling elements
        this.instances.coreStyleEl = doc.createElement("style");
        this.instances.coreStyleEl.setAttribute('type', "text/css");
        doc.head.appendChild(this.instances.coreStyleEl);

        this.instances.extendedStyleEl = doc.createElement("style");
        this.instances.extendedStyleEl.setAttribute('type', "text/css");
        doc.head.appendChild(this.instances.extendedStyleEl);

        // Compute
        this.computeStylingFromCSSBridge();
    }

    // =============================== UNLOAD =============================== //

    override onunload(): void {
        this.removeStylingForCSSBridge();
    }

    private removeStylingForCSSBridge(): void {
        this.instances.coreStyleEl?.remove();
        this.instances.extendedStyleEl?.remove();
    }

    // =============================== UPDATE =============================== //

    onCSSChange() {
        CSSBridge.computeBackgroundColor(this.instances.renderer);
        this.computeStylingFromCSSBridge();
        if (this.instances.nodesSet) {
            this.instances.nodesSet.onCSSChange();
            this.instances.linksSet.onCSSChange();
            if (this.instances.settings.enableCSS) {
                this.instances.foldersSet?.onCSSChange();
            }
            this.instances.renderer.changed();
        }
    }

    private computeStylingFromCSSBridge(): void {
        this.applyCSSStyle();

        this.instances.stylesData = {
            nodeText: this.getNodeTextStyle(),
            folder: this.getFolderStyle()
        }
    }

    // ============================= APPLY CSS ============================== //

    private applyCSSStyle(): void {
        this.applyCoreCSSStyle();
        this.applyExtendedCSSStyle();
    }

    private applyCoreCSSStyle(): void {
        if (!this.instances.coreStyleEl) return;

        const colors = this.instances.renderer.colors;

        const css = `
        .graph-view.color-fill {
            color: ${CSSBridge.colorAttributes2hex(colors.fill)};
        }
        .graph-view.color-fill-focused {
            color: ${CSSBridge.colorAttributes2hex(colors.fillFocused)};
        }
        .graph-view.color-fill-tag {
            color: ${CSSBridge.colorAttributes2hex(colors.fillTag)};
        }
        .graph-view.color-fill-attachment {
            color: ${CSSBridge.colorAttributes2hex(colors.fillAttachment)};
        }
        .graph-view.color-fill-unresolved {
            color: ${CSSBridge.colorAttributes2hex(colors.fillUnresolved)};
            opacity: ${colors.fillUnresolved.a};
        }
        .graph-view.color-arrow {
            color: ${CSSBridge.colorAttributes2hex(colors.arrow)};
            opacity: ${colors.arrow.a};
        }
        .graph-view.color-circle {
            color: ${CSSBridge.colorAttributes2hex(colors.fillFocused)};
        }
        .graph-view.color-line {
            color: ${CSSBridge.colorAttributes2hex(colors.line)};
        }
        .graph-view.color-text {
            color: ${CSSBridge.colorAttributes2hex(colors.text)};
        }
        .graph-view.color-fill-highlight {
            color: ${CSSBridge.colorAttributes2hex(colors.fillHighlight)};
        }
        .graph-view.color-line-highlight {
            color: ${CSSBridge.colorAttributes2hex(colors.lineHighlight)};
        }
        body {
            font-family: ${getComputedStyle(this.instances.renderer.interactiveEl).fontFamily};
        }`;


        this.instances.coreStyleEl.innerHTML = css;
    }

    private applyExtendedCSSStyle(): void {
        if (!this.instances.extendedStyleEl) return;

        // First, add base styling with default values
        const css = `
        .graph-view.node-text {
            font-family: ${CSSBridge.DEFAULT_TEXT_STYLE.fontFamily};
            font-size: ${CSSBridge.DEFAULT_TEXT_STYLE.fontSize};
            font-style: ${CSSBridge.DEFAULT_TEXT_STYLE.fontStyle};
            font-variant: ${CSSBridge.DEFAULT_TEXT_STYLE.fontVariant};
            font-weight: ${CSSBridge.DEFAULT_TEXT_STYLE.fontWeight};
            letter-spacing: ${CSSBridge.DEFAULT_TEXT_STYLE.letterSpacing}px;
        }
        .graph-view.link-text {
            font-family: ${CSSBridge.DEFAULT_LINK_LABEL_STYLE.textStyle.fontFamily};
            font-size: ${CSSBridge.DEFAULT_LINK_LABEL_STYLE.textStyle.fontSize};
            font-style: ${CSSBridge.DEFAULT_LINK_LABEL_STYLE.textStyle.fontStyle};
            font-variant: ${CSSBridge.DEFAULT_LINK_LABEL_STYLE.textStyle.fontVariant};
            font-weight: ${CSSBridge.DEFAULT_LINK_LABEL_STYLE.textStyle.fontWeight};
            letter-spacing: ${CSSBridge.DEFAULT_LINK_LABEL_STYLE.textStyle.letterSpacing}px;
            
            border-radius: ${CSSBridge.DEFAULT_LINK_LABEL_STYLE.radius}px;
            border-width: ${CSSBridge.DEFAULT_LINK_LABEL_STYLE.borderWidth}px;
            border-color: ${CSSBridge.colorAttributes2hex(CSSBridge.DEFAULT_LINK_LABEL_STYLE.borderColor)};
            padding: ${CSSBridge.DEFAULT_LINK_LABEL_STYLE.padding.top}px ${CSSBridge.DEFAULT_LINK_LABEL_STYLE.padding.right}px ${CSSBridge.DEFAULT_LINK_LABEL_STYLE.padding.bottom}px ${CSSBridge.DEFAULT_LINK_LABEL_STYLE.padding.left}px;
            background-color: ${CSSBridge.colorAttributes2hex(CSSBridge.DEFAULT_LINK_LABEL_STYLE.backgroundColor)};
        }
        .graph-view.folder {
            font-family: ${CSSBridge.DEFAULT_FOLDER_STYLE.textStyle.textStyle.fontFamily};
            font-size: ${CSSBridge.DEFAULT_FOLDER_STYLE.textStyle.textStyle.fontSize}px;
            font-style: ${CSSBridge.DEFAULT_FOLDER_STYLE.textStyle.textStyle.fontStyle};
            font-variant: ${CSSBridge.DEFAULT_FOLDER_STYLE.textStyle.textStyle.fontVariant};
            font-weight: ${CSSBridge.DEFAULT_FOLDER_STYLE.textStyle.textStyle.fontWeight};
            letter-spacing: ${CSSBridge.DEFAULT_FOLDER_STYLE.textStyle.textStyle.letterSpacing}px;
            text-align: ${CSSBridge.DEFAULT_FOLDER_STYLE.textStyle.align};

            border-radius: ${CSSBridge.DEFAULT_FOLDER_STYLE.radius}px;
            border-width: ${CSSBridge.DEFAULT_FOLDER_STYLE.borderWidth}px;
            opacity: ${CSSBridge.DEFAULT_FOLDER_STYLE.fillOpacity};
            padding: ${CSSBridge.DEFAULT_FOLDER_STYLE.padding.top}px ${CSSBridge.DEFAULT_FOLDER_STYLE.padding.right}px ${CSSBridge.DEFAULT_FOLDER_STYLE.padding.bottom}px ${CSSBridge.DEFAULT_FOLDER_STYLE.padding.left}px;
        }`;

        // Then, add custom styling from the snippet
        const snippetName = ExtendedGraphInstances.settings.cssSnippetFilename;
        if (!ExtendedGraphInstances.app.customCss.enabledSnippets.has(snippetName)) return;

        const snippet = [...ExtendedGraphInstances.app.customCss.csscache.entries()].find(p => path.basename(p[0], ".css") === snippetName);
        if (!snippet) return;
        this.instances.extendedStyleEl.innerHTML = css + "\n" + snippet[1];
    }

    // ============================== GET CSS =============================== //

    private getGraphComputedStyle(cssClass: string, data: { path?: string, source?: string, target?: string } = {}): CSSStyleDeclaration | undefined {
        if (!this.instances.extendedStyleEl) return;

        this.detachCSSDiv();
        const div = this.instances.extendedStyleEl.ownerDocument.createElement("div", {});
        this.instances.extendedStyleEl.ownerDocument.body.appendChild(div);
        div.classList.add("graph-view", cssClass);
        div.id = cssDivId;
        if (data.path) div.setAttribute('data-path', data.path);
        if (data.source) div.setAttribute('data-source', data.source);
        if (data.target) div.setAttribute('data-target', data.target);
        div.style.borderStyle = 'solid';
        const style = getComputedStyle(div);
        return style;
    }

    private getTextStyle(cssClass: string, data: { path?: string, source?: string, target?: string } = {}): CSSTextStyle {
        if (!this.instances.extendedStyleEl) return CSSBridge.DEFAULT_TEXT_STYLE;

        const style = this.getGraphComputedStyle(cssClass, data);
        if (!style) return CSSBridge.DEFAULT_TEXT_STYLE;

        const fontFamily = style.fontFamily;

        const fontSize = this.getUnitlessValue(style.fontSize, CSSBridge.DEFAULT_TEXT_STYLE.fontSize);

        let fontStyle = style.fontStyle.toLowerCase();
        if (!['normal', 'italic', 'oblique'].contains(fontStyle)) {
            fontStyle = CSSBridge.DEFAULT_TEXT_STYLE.fontStyle;
        }

        let fontVariant = style.fontVariant.toLowerCase();
        if (!['normal', 'small-caps'].contains(fontVariant)) {
            fontVariant = CSSBridge.DEFAULT_TEXT_STYLE.fontVariant;
        }

        let fontWeight = style.fontWeight.toLowerCase();
        if (!['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'].contains(fontWeight)) {
            fontWeight = CSSBridge.DEFAULT_TEXT_STYLE.fontWeight;
        }

        const letterSpacing = this.getUnitlessValue(style.letterSpacing, CSSBridge.DEFAULT_TEXT_STYLE.letterSpacing);

        const fill = this.getGraphComputedStyle("color-text", data)?.color ?? CSSBridge.DEFAULT_TEXT_STYLE.fill;

        const textStyle = {
            fontFamily: fontFamily,
            fontSize: fontSize,
            fontStyle: fontStyle as TextStyleFontStyle,
            fontVariant: fontVariant as TextStyleFontVariant,
            fontWeight: fontWeight as TextStyleFontWeight,
            letterSpacing: letterSpacing,
            fill: fill
        };

        this.detachCSSDiv();
        return textStyle;
    }

    getNodeTextStyle(path?: string): CSSTextStyle {
        return this.getTextStyle("node-text", { path: path });
    }

    getLinkLabelStyle(data: { source?: string, target?: string } = {}): CSSLinkLabelStyle {
        const textStyle = this.getTextStyle("link-text", data);

        const style = this.getGraphComputedStyle("link-text", data);
        if (!style) return CSSBridge.DEFAULT_LINK_LABEL_STYLE;

        const radius = this.getUnitlessValue(style.borderRadius, CSSBridge.DEFAULT_LINK_LABEL_STYLE.radius);
        const borderWidth = this.getUnitlessValue(style.borderWidth, CSSBridge.DEFAULT_LINK_LABEL_STYLE.borderWidth);
        const padding = {
            left: this.getUnitlessValue(style.paddingLeft, CSSBridge.DEFAULT_LINK_LABEL_STYLE.padding.left),
            top: this.getUnitlessValue(style.paddingTop, CSSBridge.DEFAULT_LINK_LABEL_STYLE.padding.top),
            right: this.getUnitlessValue(style.paddingRight, CSSBridge.DEFAULT_LINK_LABEL_STYLE.padding.right),
            bottom: this.getUnitlessValue(style.paddingBottom, CSSBridge.DEFAULT_LINK_LABEL_STYLE.padding.bottom),
        }

        return {
            textStyle: textStyle,
            borderWidth: borderWidth,
            padding: padding,
            radius: radius,
            backgroundColor: Color.parseCSS(style.backgroundColor),
            borderColor: Color.parseCSS(style.borderColor),
        }
    }

    private getFolderStyle(path?: string): CSSFolderStyle {
        const textStyle = this.getTextStyle("folder", { path });
        const style = this.getGraphComputedStyle("folder", { path });
        if (!style) return CSSBridge.DEFAULT_FOLDER_STYLE;

        let align = style.textAlign.toLowerCase();
        if (!['left', 'center', 'right'].contains(align)) {
            align = CSSBridge.DEFAULT_FOLDER_STYLE.textStyle.align;
        }

        const radius = this.getUnitlessValue(style.borderRadius, CSSBridge.DEFAULT_FOLDER_STYLE.radius);
        const borderWidth = this.getUnitlessValue(style.borderWidth, CSSBridge.DEFAULT_FOLDER_STYLE.borderWidth);
        const padding = {
            left: this.getUnitlessValue(style.paddingLeft, CSSBridge.DEFAULT_FOLDER_STYLE.padding.left),
            top: this.getUnitlessValue(style.paddingTop, CSSBridge.DEFAULT_FOLDER_STYLE.padding.top),
            right: this.getUnitlessValue(style.paddingRight, CSSBridge.DEFAULT_FOLDER_STYLE.padding.right),
            bottom: this.getUnitlessValue(style.paddingBottom, CSSBridge.DEFAULT_FOLDER_STYLE.padding.bottom),
        }

        const opacityString = style.opacity.toLowerCase();
        let fillOpacity = CSSBridge.DEFAULT_FOLDER_STYLE.fillOpacity;
        fillOpacity = parseFloat(opacityString.toLowerCase());
        if (isNaN(fillOpacity)) {
            fillOpacity = CSSBridge.DEFAULT_FOLDER_STYLE.fillOpacity;
        }
        else {
            fillOpacity = Math.clamp(fillOpacity, 0, 1);
        }

        const strokeOpacity = Math.min(fillOpacity * 15, 1);

        const folderStyle: CSSFolderStyle = {
            textStyle: {
                textStyle,
                align: align as 'left' | 'center' | 'right',
            },
            radius,
            borderWidth,
            fillOpacity,
            strokeOpacity,
            padding
        };

        this.detachCSSDiv();
        return folderStyle;
    }

    // ============================ Helper functions ============================ //

    private detachCSSDiv(): void {
        this.instances.extendedStyleEl?.ownerDocument.getElementById(cssDivId)?.remove();
    }

    private getUnitlessValue(valueString: string, fallback: number): number {
        valueString = valueString.toLowerCase();
        let value = fallback;
        value = parseFloat(valueString.substring(0, valueString.length - 2));
        if (isNaN(value)) {
            value = fallback;
        }
        return value;
    }

    // ========================== RENDERER COLORS =========================== //

    getPrimaryColor(): Color.Color {
        return Color.parseCSS(window.getComputedStyle(this.instances.renderer.interactiveEl).getPropertyValue('--color-base-100')).rgb;
    }

    getSearchColor(): Color.Color {
        return Color.parseCSS(window.getComputedStyle(this.instances.renderer.interactiveEl).getPropertyValue('--text-highlight-bg')).rgb;
    }

    getThemeColor(color: string): Color.Color {
        return Color.parseCSS(window.getComputedStyle(this.instances.renderer.interactiveEl).getPropertyValue('--color-' + color)).rgb;
    }

    // =========================== STATIC METHODS =========================== //

    static isNodeTextStyleDefault(style: CSSTextStyle): boolean {
        return style.fontStyle === 'normal'
            && style.fontVariant === 'normal'
            && style.fontWeight === 'normal'
            && style.letterSpacing === 0;
    }

    static colorAttributes2hex(color: GraphColorAttributes): string {
        return Color.formatHEX(color.rgb, color.a);
    }

    static getCSSSplitRGB(color: Color.Color): string {
        return `${Color.getRed(color)}, ${Color.getGreen(color)}, ${Color.getBlue(color)}`;
    }

    // Expected to be the same background color for every renderer
    static backgroundColor: Color.Color;

    private static computeBackgroundColor(renderer: GraphRenderer): Color.Color {
        let bg = window.getComputedStyle(renderer.interactiveEl).backgroundColor;
        let el: Element = renderer.interactiveEl;
        while (bg.startsWith("rgba(") && bg.endsWith(", 0)") && el.parentElement) {
            el = el.parentElement as Element;
            bg = window.getComputedStyle(el).backgroundColor;
        }

        CSSBridge.backgroundColor = Color.parseCSS(bg).rgb;
        return CSSBridge.backgroundColor;
    }
}