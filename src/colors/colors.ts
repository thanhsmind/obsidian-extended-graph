import { HexString } from 'obsidian';
import { getSortedColorAndStopPoints, getCMapData } from './colormaps';
import { ExtendedGraphSettings } from 'src/internal';
import * as Color from 'src/colors/color-bits';
import chroma from 'chroma-js';
import { Color as PixiColor, ColorSource } from "pixi.js";

export function rgb2int(rgb: number[]): Color.Color {
    return Color.newColor(rgb[0], rgb[1], rgb[2]);
}

export function int2hex(n: Color.Color): HexString {
    return Color.formatHEX(n);
}

export function hex2int(hex: string): Color.Color {
    return Color.parseHex(hex).rgb;
}

export function textColor(backgroundColor: Color.Color, dark: string = "black", light: string = "white"): string {
    return (Color.getRed(backgroundColor) * 0.299 + Color.getGreen(backgroundColor) * 0.587 + Color.getBlue(backgroundColor) * 0.114 > 150) ? dark : light;
}

export function pixiColor2int(color: ColorSource): Color.Color {
    return new PixiColor(color).toNumber();
}

export function pixiColor2hex(color: ColorSource): HexString {
    return new PixiColor(color).toHex();
}

export function plotColorMapFromName(canvas: HTMLCanvasElement, name: string, settings: ExtendedGraphSettings) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let data = getCMapData(name, settings);
    if (!data) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    plotColorMap(canvas, data.reverse, data.interpolate, data.colors, data.stops);
}

/**
 * 
 * @param canvas 
 * @param reverse 
 * @param interpolate 
 * @param colors - Between 0 and 1
 * @param stops 
 * @returns 
 */
export function plotColorMap(canvas: HTMLCanvasElement, reverse: boolean, interpolate: boolean, colors: Color.Color[], stops?: number[]) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { colors: sortedColors, stops: sortedStops } = getSortedColorAndStopPoints(colors, stops);

    /*
    // Display the values from the sampling algorithm rather than the canvas methods
    for (let x = 0; x <= 256; x++) {
        const color = sampleColor(x / 256, interpolate, sortedColors, sortedStops, reverse);
        const r = color[0];
        const g = color[1];
        const b = color[2];
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        ctx.fillRect(x * canvas.width / 256, 0, canvas.width / 256, canvas.height);
    }
    return;
    */

    if (interpolate) {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        for (let i = 0; i < sortedColors.length; ++i) {
            const stop = sortedStops[i];
            gradient.addColorStop(stop, Color.formatHEX(sortedColors[i]));
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    else {
        for (let i = 0; i < sortedColors.length; ++i) {
            const stopPrevious = i === 0 ? 0 : sortedStops[i];
            const stopNext = i === sortedColors.length - 1 ? 1 : sortedStops[Math.min(i + 1, sortedStops.length - 1)];
            ctx.fillStyle = Color.formatHEX(sortedColors[i]);
            ctx.fillRect(stopPrevious * canvas.width, 0, stopNext * canvas.width, canvas.height);
        }
    }

    canvas.addClass("palette-canvas");
    canvas.toggleClass("reversed", reverse);
}

export function randomColor(): Color.Color {
    return GoldenColor.random(50, 95);
}

class GoldenColor {
    private static goldenRatioConjugate: number = 0.618033988749895;
    private static h: number = Math.random();

    private constructor() { }

    public static random(s: number = 50, v: number = 95): Color.Color {
        GoldenColor.h += GoldenColor.goldenRatioConjugate;
        GoldenColor.h %= 1;
        const color = chroma.hsl(Math.floor(GoldenColor.h * 360), s, v);
        return color.num();
    }
}