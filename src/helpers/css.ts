
import path from "path";
import { ColorSource, TextStyleFill, TextStyleFontStyle, TextStyleFontVariant, TextStyleFontWeight } from "pixi.js";
import { GraphInstances, int2hex, PluginInstances } from "src/internal";

// =============================== Text Style =============================== //

export interface CSSTextStyle {
    fontFamily: string;
    fontSize: number;
    fontStyle: TextStyleFontStyle;
    fontVariant: TextStyleFontVariant;
    fontWeight: TextStyleFontWeight;
    letterSpacing: number;
    fill?: TextStyleFill;
}

const DEFAULT_TEXT_STYLE: CSSTextStyle = {
    fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Microsoft YaHei Light", sans-serif',
    fontSize: 14,
    fontStyle: 'normal',
    fontVariant: 'normal',
    fontWeight: 'normal',
    letterSpacing: 0
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

export const DEFAULT_FOLDER_STYLE: CSSFolderStyle = {
    textStyle: {
        textStyle: DEFAULT_TEXT_STYLE,
        align: 'center',
    },
    radius: 50,
    borderWidth: 2,
    fillOpacity: 0.03,
    strokeOpacity: 0.03 * 15,
    padding: { left: 0, top: 0, right: 0, bottom: 0 },
}

// ============================ Link Label Style ============================ //

export interface CSSLinkLabelStyle {
    textStyle: CSSTextStyle,
    radius: number;
    borderWidth: number;
    borderColor?: ColorSource;
    padding: { left: number, top: number, right: number, bottom: number };
    backgroundColor?: ColorSource;
}

const DEFAULT_LINK_LABEL_STYLE: CSSLinkLabelStyle = {
    textStyle: DEFAULT_TEXT_STYLE,
    radius: 0,
    borderWidth: 0,
    padding: { left: 0, top: 0, right: 0, bottom: 0 },
    borderColor: "transparent",
    backgroundColor: "transparent"
}

// ==================== Creation of the <style> elements ==================== //

const cssDivId = "extended-graph-css-div";

export function applyCSSStyle(instances: GraphInstances): void {
    applyCoreCSSStyle(instances);
    applyExtendedCSSStyle(instances);
}

function applyCoreCSSStyle(instances: GraphInstances): void {
    if (!instances.coreStyleEl) return;

    const colors = instances.renderer.colors;

    const css = `
    .graph-view.color-fill {
        color: ${int2hex(colors.fill.rgb)};
    }
    .graph-view.color-fill-focused {
        color: ${int2hex(colors.fillFocused.rgb)};
    }
    .graph-view.color-fill-tag {
        color: ${int2hex(colors.fillTag.rgb)};
    }
    .graph-view.color-fill-attachment {
        color: ${int2hex(colors.fillAttachment.rgb)};
    }
    .graph-view.color-fill-unresolved {
        color: ${int2hex(colors.fillUnresolved.rgb)};
        opacity: ${colors.fillUnresolved.a};
    }
    .graph-view.color-arrow {
        color: ${int2hex(colors.arrow.rgb)};
        opacity: ${colors.arrow.a};
    }
    .graph-view.color-circle {
        color: ${int2hex(colors.fillFocused.rgb)};
    }
    .graph-view.color-line {
        color: ${int2hex(colors.line.rgb)};
    }
    .graph-view.color-text {
        color: ${
        // @ts-ignore
        int2hex(colors.text.rgb)
        };
    }
    .graph-view.color-fill-highlight {
        color: ${int2hex(colors.fillHighlight.rgb)};
    }
    .graph-view.color-line-highlight {
        color: ${int2hex(colors.lineHighlight.rgb)};
    }
    body {
        font-family: ${getComputedStyle(instances.renderer.interactiveEl).fontFamily};
    }`;


    instances.coreStyleEl.innerHTML = css;
}

function applyExtendedCSSStyle(instances: GraphInstances): void {
    if (!instances.extendedStyleEl) return;

    // First, add base styling with default values
    const css = `
    .graph-view.node-text {
        font-family: ${DEFAULT_TEXT_STYLE.fontFamily};
        font-size: ${DEFAULT_TEXT_STYLE.fontSize};
        font-style: ${DEFAULT_TEXT_STYLE.fontStyle};
        font-variant: ${DEFAULT_TEXT_STYLE.fontVariant};
        font-weight: ${DEFAULT_TEXT_STYLE.fontWeight};
        letter-spacing: ${DEFAULT_TEXT_STYLE.letterSpacing}px;
    }
    .graph-view.link-text {
        font-family: ${DEFAULT_LINK_LABEL_STYLE.textStyle.fontFamily};
        font-size: ${DEFAULT_LINK_LABEL_STYLE.textStyle.fontSize};
        font-style: ${DEFAULT_LINK_LABEL_STYLE.textStyle.fontStyle};
        font-variant: ${DEFAULT_LINK_LABEL_STYLE.textStyle.fontVariant};
        font-weight: ${DEFAULT_LINK_LABEL_STYLE.textStyle.fontWeight};
        letter-spacing: ${DEFAULT_LINK_LABEL_STYLE.textStyle.letterSpacing}px;
        
        border-radius: ${DEFAULT_LINK_LABEL_STYLE.radius}px;
        border-width: ${DEFAULT_LINK_LABEL_STYLE.borderWidth}px;
        border-color: ${DEFAULT_LINK_LABEL_STYLE.borderColor};
        padding: ${DEFAULT_LINK_LABEL_STYLE.padding.top}px ${DEFAULT_LINK_LABEL_STYLE.padding.right}px ${DEFAULT_LINK_LABEL_STYLE.padding.bottom}px ${DEFAULT_LINK_LABEL_STYLE.padding.left}px;
        background-color: ${DEFAULT_LINK_LABEL_STYLE.backgroundColor};
    }
    .graph-view.folder {
        font-family: ${DEFAULT_FOLDER_STYLE.textStyle.textStyle.fontFamily};
        font-size: ${DEFAULT_FOLDER_STYLE.textStyle.textStyle.fontSize}px;
        font-style: ${DEFAULT_FOLDER_STYLE.textStyle.textStyle.fontStyle};
        font-variant: ${DEFAULT_FOLDER_STYLE.textStyle.textStyle.fontVariant};
        font-weight: ${DEFAULT_FOLDER_STYLE.textStyle.textStyle.fontWeight};
        letter-spacing: ${DEFAULT_FOLDER_STYLE.textStyle.textStyle.letterSpacing}px;
        text-align: ${DEFAULT_FOLDER_STYLE.textStyle.align};

        border-radius: ${DEFAULT_FOLDER_STYLE.radius}px;
        border-width: ${DEFAULT_FOLDER_STYLE.borderWidth}px;
        opacity: ${DEFAULT_FOLDER_STYLE.fillOpacity};
        padding: ${DEFAULT_FOLDER_STYLE.padding.top}px ${DEFAULT_FOLDER_STYLE.padding.right}px ${DEFAULT_FOLDER_STYLE.padding.bottom}px ${DEFAULT_FOLDER_STYLE.padding.left}px;
    }`;

    // Then, add custom styling from the snippet
    const snippetName = PluginInstances.settings.cssSnippetFilename;
    if (!PluginInstances.app.customCss.enabledSnippets.has(snippetName)) return;

    const snippet = [...PluginInstances.app.customCss.csscache.entries()].find(p => path.basename(p[0], ".css") === snippetName);
    if (!snippet) return;
    instances.extendedStyleEl.innerHTML = css + "\n" + snippet[1];
}

// ============================ Helper functions ============================ //

function getGraphComputedStyle(instances: GraphInstances, cssClass: string, data: { path?: string, source?: string, target?: string } = {}): CSSStyleDeclaration {
    if (!instances.extendedStyleEl) return new CSSStyleDeclaration();

    detachCSSDiv(instances);
    const div = instances.extendedStyleEl.ownerDocument.createElement("div", {});
    instances.extendedStyleEl.ownerDocument.body.appendChild(div);
    div.classList.add("graph-view", cssClass);
    div.id = cssDivId;
    if (data.path) div.setAttribute('data-path', data.path);
    if (data.source) div.setAttribute('data-source', data.source);
    if (data.target) div.setAttribute('data-target', data.target);
    div.style.borderStyle = 'solid';
    const style = getComputedStyle(div);
    return style;
}

function detachCSSDiv(instances: GraphInstances): void {
    instances.extendedStyleEl?.ownerDocument.getElementById(cssDivId)?.remove();
}

function getUnitlessValue(valueString: string, fallback: number): number {
    valueString = valueString.toLowerCase();
    let value = fallback;
    value = parseFloat(valueString.substring(0, valueString.length - 2));
    if (isNaN(value)) {
        value = fallback;
    }
    return value;
}

// ====================== Get style for a given element ===================== //

function getTextStyle(instances: GraphInstances, cssClass: string, data: { path?: string, source?: string, target?: string } = {}): CSSTextStyle {
    if (!instances.extendedStyleEl) return DEFAULT_TEXT_STYLE;

    const style = getGraphComputedStyle(instances, cssClass, data);

    const fontFamily = style.fontFamily;

    const fontSize = getUnitlessValue(style.fontSize, DEFAULT_TEXT_STYLE.fontSize);

    let fontStyle = style.fontStyle.toLowerCase();
    if (!['normal', 'italic', 'oblique'].contains(fontStyle)) {
        fontStyle = DEFAULT_TEXT_STYLE.fontStyle;
    }

    let fontVariant = style.fontVariant.toLowerCase();
    if (!['normal', 'small-caps'].contains(fontVariant)) {
        fontVariant = DEFAULT_TEXT_STYLE.fontVariant;
    }

    let fontWeight = style.fontWeight.toLowerCase();
    if (!['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'].contains(fontWeight)) {
        fontWeight = DEFAULT_TEXT_STYLE.fontWeight;
    }

    const letterSpacing = getUnitlessValue(style.letterSpacing, DEFAULT_TEXT_STYLE.letterSpacing);

    const fill = getGraphComputedStyle(instances, "color-text", data).color;

    const textStyle = {
        fontFamily: fontFamily,
        fontSize: fontSize,
        fontStyle: fontStyle as TextStyleFontStyle,
        fontVariant: fontVariant as TextStyleFontVariant,
        fontWeight: fontWeight as TextStyleFontWeight,
        letterSpacing: letterSpacing,
        fill: fill
    };

    detachCSSDiv(instances);
    return textStyle;
}

export function getNodeTextStyle(instances: GraphInstances, path?: string): CSSTextStyle {
    return getTextStyle(instances, "node-text", { path: path });
}

export function getLinkLabelStyle(instances: GraphInstances, data: { source?: string, target?: string } = {}): CSSLinkLabelStyle {
    const textStyle = getTextStyle(instances, "link-text", data);

    const style = getGraphComputedStyle(instances, "link-text", data);

    const radius = getUnitlessValue(style.borderRadius, DEFAULT_LINK_LABEL_STYLE.radius);
    const borderWidth = getUnitlessValue(style.borderWidth, DEFAULT_LINK_LABEL_STYLE.borderWidth);
    const padding = {
        left: getUnitlessValue(style.paddingLeft, DEFAULT_LINK_LABEL_STYLE.padding.left),
        top: getUnitlessValue(style.paddingTop, DEFAULT_LINK_LABEL_STYLE.padding.top),
        right: getUnitlessValue(style.paddingRight, DEFAULT_LINK_LABEL_STYLE.padding.right),
        bottom: getUnitlessValue(style.paddingBottom, DEFAULT_LINK_LABEL_STYLE.padding.bottom),
    }

    return {
        textStyle: textStyle,
        borderWidth: borderWidth,
        padding: padding,
        radius: radius,
        backgroundColor: style.backgroundColor === "rgba(0, 0, 0, 0)" ? undefined : style.backgroundColor,
        borderColor: style.borderColor === "rgba(0, 0, 0, 0)" ? undefined : style.borderColor,
    }
}

export function getFolderStyle(instances: GraphInstances, path?: string): CSSFolderStyle {
    if (!instances.extendedStyleEl) return DEFAULT_FOLDER_STYLE;

    const textStyle = getTextStyle(instances, "folder", { path });

    const style = getGraphComputedStyle(instances, "folder", { path });

    let align = style.textAlign.toLowerCase();
    if (!['left', 'center', 'right'].contains(align)) {
        align = DEFAULT_FOLDER_STYLE.textStyle.align;
    }

    const radius = getUnitlessValue(style.borderRadius, DEFAULT_FOLDER_STYLE.radius);
    const borderWidth = getUnitlessValue(style.borderWidth, DEFAULT_FOLDER_STYLE.borderWidth);
    const padding = {
        left: getUnitlessValue(style.paddingLeft, DEFAULT_FOLDER_STYLE.padding.left),
        top: getUnitlessValue(style.paddingTop, DEFAULT_FOLDER_STYLE.padding.top),
        right: getUnitlessValue(style.paddingRight, DEFAULT_FOLDER_STYLE.padding.right),
        bottom: getUnitlessValue(style.paddingBottom, DEFAULT_FOLDER_STYLE.padding.bottom),
    }

    const opacityString = style.opacity.toLowerCase();
    let fillOpacity = DEFAULT_FOLDER_STYLE.fillOpacity;
    fillOpacity = parseFloat(opacityString.toLowerCase());
    if (isNaN(fillOpacity)) {
        fillOpacity = DEFAULT_FOLDER_STYLE.fillOpacity;
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

    detachCSSDiv(instances);
    return folderStyle;
}

// ======================== Other exported functions ======================== //

export function isNodeTextStyleDefault(style: CSSTextStyle): boolean {
    return style.fontStyle === 'normal'
        && style.fontVariant === 'normal'
        && style.fontWeight === 'normal'
        && style.letterSpacing === 0;
}