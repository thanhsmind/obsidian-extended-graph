import STRINGS from "src/Strings";

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
    return (key.length> 0);
}

export function isTagValid(name: string): boolean {
    return /^[a-zA-Z/]+$/.test(name);
}

export function getLinkDestination(link: string): string {
    return link.replace("[[", "").replace("]]", "");
}