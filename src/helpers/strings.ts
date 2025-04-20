import STRINGS from "src/Strings";
import P from "parsimmon";
import emojiRegex from "emoji-regex";

export function capitalizeFirstLetter(val: string) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

export function isNumber(value: string): boolean {
    return /^\d+(\.\d+)?$/.test(value);
}

export function isRegex(value: string): boolean {
    return value.length > 2 && value.startsWith("/") && value.endsWith("/");
}

export function regExpFromString(value: string): RegExp | undefined {
    if (!isRegex(value)) return;
    return new RegExp(value.slice(1, value.length - 1));
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

export function makeCompatibleForClass(str: string): string {
    return str.replaceAll(" ", "-").replaceAll(/[~!@$%^&*()+=,.\\\/';:"?><[\]{}|`#]/g, "");
}

export function getListOfSubpaths(fullpath: string): string[] {
    return fullpath.split("/").reduce((acc: string[], el: string, i: number) => {
        if (el === "") return acc;
        const last = acc.last();
        if (last && last !== "") acc.push(last + "/" + el);
        else acc.push(el);
        return acc;
    }, []);
}

export function isEmoji(str: string): boolean {
    return emojiRegex().test(str);
    //return /^[\p{Extended_Pictographic}\p{Emoji_Component}]+$/gu.test(str);
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