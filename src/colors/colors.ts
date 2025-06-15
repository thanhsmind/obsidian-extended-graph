import { HexString } from 'obsidian';
import { evaluateCMap, getSortedColorAndStopPoints, getCMapData, sampleColor } from './colormaps';
import { ExtendedGraphSettings } from 'src/internal';

export function rgb2int(rgb: Uint8Array): number {
    return rgb[0] * (256 * 256) + rgb[1] * 256 + rgb[2];
}

export function int2hex(n: number): HexString {
    return "#" + n.toString(16);
}

export function int2rgb(n: number): Uint8Array {
    return hex2rgb(int2hex(n));
}

/**
 * Convert HSV to RGB
 * @param hsv h: 0-360, s: 0-100, v: 0-100
 * @returns RGB 8 bit array
 */
export function hsv2rgb(hsv: { h: number, s: number, v: number }): Uint8Array {
    hsv.h /= 360; hsv.s /= 100; hsv.v /= 100;
    let r, g, b;

    const i = Math.floor(hsv.h * 6);
    const f = hsv.h * 6 - i;
    const p = hsv.v * (1 - hsv.s);
    const q = hsv.v * (1 - f * hsv.s);
    const t = hsv.v * (1 - (1 - f) * hsv.s);

    switch (i % 6) {
        case 0: r = hsv.v, g = t, b = p; break;
        case 1: r = q, g = hsv.v, b = p; break;
        case 2: r = p, g = hsv.v, b = t; break;
        case 3: r = p, g = q, b = hsv.v; break;
        case 4: r = t, g = p, b = hsv.v; break;
        default: r = hsv.v, g = p, b = q; break;
    }

    return new Uint8Array([r * 255, g * 255, b * 255]);
}

export function hex2int(hex: string): number {
    return rgb2int(hex2rgb(hex));
}

/**
 * Convert a hex color to an RGB array
 * @param hex format: #RRGGBB
 * @returns RGB 8 bit array
 */
export function hex2rgb(hex: string): Uint8Array {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return new Uint8Array([0, 0, 0]);
    return new Uint8Array([
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ]);
}

export function componentToHex(c: number): string {
    let result = c.toString(16);
    if (result.length === 1) {
        result = '0' + result;
    }
    return result;
}

export function rgb2hex(rgb: Uint8Array): string {
    return "#" + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);
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
export function plotColorMap(canvas: HTMLCanvasElement, reverse: boolean, interpolate: boolean, colors: number[][], stops?: number[]) {
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
            const r = Math.round(sortedColors[i][0] * 255);
            const g = Math.round(sortedColors[i][1] * 255);
            const b = Math.round(sortedColors[i][2] * 255);
            gradient.addColorStop(stop, `rgb(${r} ${g} ${b})`);
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    else {
        for (let i = 0; i < sortedColors.length; ++i) {
            const stopPrevious = i === 0 ? 0 : sortedStops[i];
            const stopNext = i === sortedColors.length - 1 ? 1 : sortedStops[Math.min(i + 1, sortedStops.length - 1)];
            const r = Math.round(sortedColors[i][0] * 255);
            const g = Math.round(sortedColors[i][1] * 255);
            const b = Math.round(sortedColors[i][2] * 255);
            ctx.fillStyle = `rgb(${r} ${g} ${b})`;
            ctx.fillRect(stopPrevious * canvas.width, 0, stopNext * canvas.width, canvas.height);
        }
    }

    canvas.addClass("palette-canvas");
    canvas.toggleClass("reversed", reverse);
}

export function randomColor(): HexString {
    return GoldenColor.random(50, 95);
}

class GoldenColor {
    private static goldenRatioConjugate: number = 0.618033988749895;
    private static h: number = Math.random();

    private constructor() { }

    public static random(s: number = 50, v: number = 95): string {
        GoldenColor.h += GoldenColor.goldenRatioConjugate;
        GoldenColor.h %= 1;
        const color = hsv2rgb({ h: Math.floor(GoldenColor.h * 360), s: s, v: v });
        return rgb2hex(color);
    }
}