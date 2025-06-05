
import { TextStyleAlign, TextStyleFontStyle, TextStyleFontVariant, TextStyleFontWeight } from "pixi.js";

export interface CSSTextStyle {
    fontFamily: string;
    fontStyle: TextStyleFontStyle;
    fontVariant: TextStyleFontVariant;
    fontWeight: TextStyleFontWeight;
    letterSpacing: number
}

export interface CSSFolderTextStyle {
    textStyle: CSSTextStyle;
    fontSize: number;
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

function getTextStyle(cssClass: string): CSSTextStyle {
    const cssDiv = document.body.createDiv("graph-view " + cssClass);
    const style = getComputedStyle(cssDiv);

    const fontFamily = style.fontFamily;

    let fontStyle = style.fontStyle.toLowerCase();
    if (['normal', 'italic', 'oblique'].contains(fontStyle)) {
        fontStyle = 'normal';
    }

    let fontVariant = style.fontVariant.toLowerCase();
    if (!['normal', 'small-caps'].contains(fontVariant)) {
        fontVariant = 'normal';
    }

    let fontWeight = style.fontWeight.toLowerCase();
    if (!['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'].contains(fontWeight)) {
        fontWeight = 'normal';
    }

    const letterSpacing = getUnitlessPixel(style.letterSpacing, 0);

    cssDiv.detach();

    const textStyle = {
        fontFamily: fontFamily,
        fontStyle: fontStyle as TextStyleFontStyle,
        fontVariant: fontVariant as TextStyleFontVariant,
        fontWeight: fontWeight as TextStyleFontWeight,
        letterSpacing: letterSpacing
    };
    return textStyle;
}

export function getNodeTextStyle(): CSSTextStyle {
    return getTextStyle("node-text");
}

export function isNodeTextStyleDefault(style: CSSTextStyle): boolean {
    return style.fontStyle === 'normal'
        && style.fontVariant === 'normal'
        && style.fontWeight === 'normal'
        && style.letterSpacing === 0;
}

export function getFolderStyle(): CSSFolderStyle {
    const textStyle = getTextStyle("folder");

    const cssDiv = document.body.createDiv("graph-view folder");
    cssDiv.style.borderStyle = 'solid';
    const style = getComputedStyle(cssDiv);

    let align = style.textAlign.toLowerCase();
    if (!['left', 'center', 'right'].contains(align)) {
        align = 'center';
    }

    const fontSize = getUnitlessPixel(style.fontSize, 14);
    const radius = getUnitlessPixel(style.borderRadius, 50);
    const borderWidth = getUnitlessPixel(style.borderWidth, 2);
    const padding = {
        left: getUnitlessPixel(style.paddingLeft, 0),
        top: getUnitlessPixel(style.paddingTop, 0),
        right: getUnitlessPixel(style.paddingRight, 0),
        bottom: getUnitlessPixel(style.paddingBottom, 0),
    }

    const opacityString = style.opacity.toLowerCase();
    let fillOpacity = 0.03;
    fillOpacity = parseFloat(opacityString.toLowerCase());
    if (isNaN(fillOpacity)) {
        fillOpacity = 0.03;
    }
    else {
        fillOpacity = Math.clamp(fillOpacity, 0, 1);
    }

    const strokeOpacity = Math.min(fillOpacity * 15, 1);

    cssDiv.detach();

    const folderStyle: CSSFolderStyle = {
        textStyle: { textStyle, fontSize, align: align as 'left' | 'center' | 'right' },
        radius,
        borderWidth,
        fillOpacity,
        strokeOpacity,
        padding
    };
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