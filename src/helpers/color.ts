import chroma from "chroma-js";
import { GraphColorAttributes } from "obsidian-typings";

export function textColor(backgroundColor: Uint8Array, dark: string = "black", light: string = "white"): string {
    const textColor = (backgroundColor[0] * 0.299 + backgroundColor[1] * 0.587 + backgroundColor[2] * 0.114 > 150) ? dark : light;
    return textColor;
}