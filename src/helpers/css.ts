
import path from "path";
import { TextStyleFill, TextStyleFontStyle, TextStyleFontVariant, TextStyleFontWeight } from "pixi.js";
import { GraphInstances, int2hex, PluginInstances } from "src/internal";

export interface CSSTextStyle {
    fontFamily: string;
    fontStyle: TextStyleFontStyle;
    fontVariant: TextStyleFontVariant;
    fontWeight: TextStyleFontWeight;
    letterSpacing: number;
    fill?: TextStyleFill;
}

export interface CSSFolderTextStyle {
    textStyle: CSSTextStyle;
    fontSize: number;
    align: 'left' | 'center' | 'right';
    decoration: 'none' | 'underline' | 'line-through';
}

export interface CSSFolderStyle {
    textStyle: CSSFolderTextStyle;
    radius: number;
    borderWidth: number;
    fillOpacity: number;
    strokeOpacity: number;
    padding: { left: number, top: number, right: number, bottom: number };
}

const DEFAULT_TEXT_STYLE: CSSTextStyle = {
    fontFamily: "??",
    fontStyle: 'normal',
    fontVariant: 'normal',
    fontWeight: 'normal',
    letterSpacing: 0
}

const cssDivId = "extended-graph-css-div";

export const DEFAULT_FOLDER_STYLE: CSSFolderStyle = {
    textStyle: {
        textStyle: DEFAULT_TEXT_STYLE,
        align: 'center',
        fontSize: 14,
        decoration: 'none',
    },
    radius: 50,
    borderWidth: 2,
    fillOpacity: 0.03,
    strokeOpacity: 0.03 * 15,
    padding: { left: 0, top: 0, right: 0, bottom: 0 },
}

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
        font-style: ${DEFAULT_TEXT_STYLE.fontStyle};
        font-variant: ${DEFAULT_TEXT_STYLE.fontVariant};
        font-weight: ${DEFAULT_TEXT_STYLE.fontWeight};
        letter-spacing: ${DEFAULT_TEXT_STYLE.letterSpacing}px;
    }
    .graph-view.folder {
        font-family: ${DEFAULT_FOLDER_STYLE.textStyle.textStyle.fontFamily};
        font-style: ${DEFAULT_FOLDER_STYLE.textStyle.textStyle.fontStyle};
        font-variant: ${DEFAULT_FOLDER_STYLE.textStyle.textStyle.fontVariant};
        font-weight: ${DEFAULT_FOLDER_STYLE.textStyle.textStyle.fontWeight};
        letter-spacing: ${DEFAULT_FOLDER_STYLE.textStyle.textStyle.letterSpacing}px;
        font-size: ${DEFAULT_FOLDER_STYLE.textStyle.fontSize}px;
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

function getGraphComputedStyle(instances: GraphInstances, cssClass: string, path?: string): CSSStyleDeclaration {
    if (!instances.extendedStyleEl) return new CSSStyleDeclaration();

    detachCSSDiv(instances);
    const div = instances.extendedStyleEl.ownerDocument.createElement("div", {});
    instances.extendedStyleEl.ownerDocument.body.appendChild(div);
    div.classList.add("graph-view", cssClass);
    div.id = cssDivId;
    if (path) {
        div.setAttribute('data-path', path);
    }
    div.style.borderStyle = 'solid';
    const style = getComputedStyle(div);
    return style;
}

function detachCSSDiv(instances: GraphInstances): void {
    instances.extendedStyleEl?.ownerDocument.getElementById(cssDivId)?.remove();
}

function getTextStyle(instances: GraphInstances, cssClass: string, path?: string): CSSTextStyle {
    if (!instances.extendedStyleEl) return DEFAULT_TEXT_STYLE;

    const style = getGraphComputedStyle(instances, cssClass, path);

    const fontFamily = style.fontFamily;

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

    const letterSpacing = getUnitlessPixel(style.letterSpacing, DEFAULT_TEXT_STYLE.letterSpacing);

    const fill = getGraphComputedStyle(instances, "color-text", path).color;

    const textStyle = {
        fontFamily: fontFamily,
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
    return getTextStyle(instances, "node-text", path);
}

export function isNodeTextStyleDefault(style: CSSTextStyle): boolean {
    return style.fontStyle === 'normal'
        && style.fontVariant === 'normal'
        && style.fontWeight === 'normal'
        && style.letterSpacing === 0;
}

export function getFolderStyle(instances: GraphInstances, path?: string): CSSFolderStyle {
    if (!instances.extendedStyleEl) return DEFAULT_FOLDER_STYLE;

    const textStyle = getTextStyle(instances, "folder", path);

    const style = getGraphComputedStyle(instances, "folder", path);

    let align = style.textAlign.toLowerCase();
    if (!['left', 'center', 'right'].contains(align)) {
        align = DEFAULT_FOLDER_STYLE.textStyle.align;
    }

    let decoration = style.textDecorationLine.toLowerCase();
    if (!['none', 'underline', 'line-through'].contains(decoration)) {
        decoration = DEFAULT_FOLDER_STYLE.textStyle.decoration;
    }

    const fontSize = getUnitlessPixel(style.fontSize, DEFAULT_FOLDER_STYLE.textStyle.fontSize);
    const radius = getUnitlessPixel(style.borderRadius, DEFAULT_FOLDER_STYLE.radius);
    const borderWidth = getUnitlessPixel(style.borderWidth, DEFAULT_FOLDER_STYLE.borderWidth);
    const padding = {
        left: getUnitlessPixel(style.paddingLeft, DEFAULT_FOLDER_STYLE.padding.left),
        top: getUnitlessPixel(style.paddingTop, DEFAULT_FOLDER_STYLE.padding.top),
        right: getUnitlessPixel(style.paddingRight, DEFAULT_FOLDER_STYLE.padding.right),
        bottom: getUnitlessPixel(style.paddingBottom, DEFAULT_FOLDER_STYLE.padding.bottom),
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
            fontSize,
            align: align as 'left' | 'center' | 'right',
            decoration: decoration as 'none' | 'underline' | 'line-through',
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

function getUnitlessPixel(valueString: string, fallback: number): number {
    valueString = valueString.toLowerCase();
    let value = fallback;
    if (valueString.endsWith("px")) {
        value = parseFloat(valueString);
        if (isNaN(value)) {
            value = fallback;
        }
    }
    return value;
}