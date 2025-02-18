import STRINGS from "src/Strings";
import P from "parsimmon";
import emojiRegex from "emoji-regex";

export function capitalizeFirstLetter(val: string) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

export function isNumber(value: string) {
    return /^\d+(\.\d+)?$/.test(value);
}

export function isPropertyKeyValid(key: string): boolean {
    if (key.contains(":")) {
        new Notice(STRINGS.notices.invalidCharacter + " ':'");
        return false;
    }
    return (key.length > 0);
}

export function isTagValid(name: string): boolean {
    return /^[a-zA-Z/]+$/.test(name);
}

export function getLinkDestination(link: string): string {
    return link.replace("[[", "").replace("]]", "");
}


// Code from the Dataview plugin, under MIT License
// https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/util/normalize.ts
const VAR_NAME_CANONICALIZER: P.Parser<string> = P.alt(
        P.regex(new RegExp(emojiRegex(), "")),
        P.regex(/[0-9\p{Letter}_-]+/u).map((str: string) => str.toLocaleLowerCase()),
        P.whitespace.map((_: any) => "-"),
        P.any.map((_: any) => "")
    )
    .many()
    .map((result: string[]) => result.join(""));

export function canonicalizeVarName(name: string): string {
    return VAR_NAME_CANONICALIZER.tryParse(name);
}