
import { TextStyleFontStyle, TextStyleFontVariant, TextStyleFontWeight } from "pixi.js";

export interface NodeTextStyle {
    fontFamily: string;
    fontStyle: TextStyleFontStyle;
    fontVariant: TextStyleFontVariant;
    fontWeight: TextStyleFontWeight;
    letterSpacing: number
}

export function getNodeTextStyle(): NodeTextStyle {
    const cssDiv = document.body.createDiv("graph-view node-text");
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
    if (!['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'].contains(fontVariant)) {
        fontWeight = 'normal';
    }
    const letterSpacingString = style.letterSpacing.toLowerCase();
    let letterSpacing = 0;
    if (letterSpacingString.endsWith("px")) {
        letterSpacing = parseFloat(letterSpacingString.toLowerCase());
        if (isNaN(letterSpacing)) {
            letterSpacing = 0;
        }
    }
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

export function isNodeTextStyleDefault(style: NodeTextStyle): boolean {
    return style.fontStyle === 'normal'
        && style.fontVariant === 'normal'
        && style.fontWeight === 'normal'
        && style.letterSpacing === 0;
}