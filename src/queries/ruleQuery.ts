import { App, TFile, TFolder } from "obsidian";
import { TAG_KEY, LINK_KEY } from "src/globalVariables";
import { getFileInteractives } from "src/helperFunctions";

export type SourceKey = 'tag' | 'link' | 'property' | 'folder' | 'folder_rec';
export type LogicKey = 'is' | 'isNot' | 'contains' | 'containsNot' | 'matchesRegex' | 'matchesRegexNot' | 'containsRegex' | 'containsRegexNot';

export const sourceKeyLabel: Record<SourceKey, string> = {
    'tag': 'Tags',
    'link': 'Links',
    'property': 'Property',
    'folder': 'Folder',
    'folder_rec': 'Folder and subfolders'
}

export const logicKeyLabel: Record<LogicKey, string> = {
    'is': "is",
    'isNot': "is not",
    'contains': "contains",
    'containsNot': "doesn't contain",
    'matchesRegex': "matches regex",
    'matchesRegexNot': "doesn't match regex",
    'containsRegex': "contains regex",
    'containsRegexNot': "doesn't contain regex"
}

export class RuleQuery {
    source: string;
    property: string;
    value: string;
    logic: string;

    constructor(rec: Record<string, string>) {
        this.source   = rec['source'] ?? '';
        this.property = rec['property'] ?? '';
        this.value    = rec['value'] ?? '';
        this.logic    = rec['logic'] ?? '';
    }

    getRecord(): Record<string, string> {
        return {
            source: this.source,
            property: this.property,
            value: this.value,
            logic: this.logic
        };
    }

    doesMatch(app: App, file: TFile): boolean | null {
        if (!this.isValid()) return null;
        console.log(this.toString(), file.path);
        const folder = file.path;
        switch ((this.source as SourceKey)) {
            case 'tag':
                const tags = getFileInteractives(TAG_KEY, app, file);
                return this.checkLogic([...tags]);
                
            case 'link':
                const links = getFileInteractives(LINK_KEY, app, file);
                return this.checkLogic([...links]);

            case 'property':
                if (!this.property) break;
                const properties = getFileInteractives(this.property, app, file);
                return this.checkLogic([...properties]);

            case 'folder':
                return this.checkLogic([...folder]);

            case 'folder_rec':
                const folders: string[] = [];
                let currentFolder: TFolder | null = file.parent;
                while (currentFolder) {
                    folders.push(currentFolder.path);
                    currentFolder = currentFolder.parent;
                }
                return this.checkLogic(folders);
        
            default:
                break;
        }
        return false;
    }

    private checkLogic(values: string[]): boolean {
        switch ((this.logic as LogicKey)) {
            case 'is':
                return values.length === 1 && values[0] === this.value;
            case 'isNot':
                return values.length === 1 && values[0] !== this.value;
            case 'contains':
                return values.contains(this.value);
            case 'containsNot':
                return !values.contains(this.value);
            case 'matchesRegex':
                return values.length === 1 && new RegExp(values[0]).test(this.value);
            case 'matchesRegexNot':
                return values.length === 1 && !(new RegExp(values[0]).test(this.value));
            case 'containsRegex':
                return values.some(v => new RegExp(v).test(this.value));
            case 'containsRegexNot':
                return values.every(v => !(new RegExp(v).test(this.value)));
            default:
                break;
        }
        return false;
    }

    isValid(): boolean {
        if (this.source === "") return false;
        if (this.source === "property" && this.property === "") return false;
        if (this.value === "") return false;
        if (this.logic === "") return false;
        return true;
    }

    toString(): string | null {
        if (!this.isValid()) return null;
        let str = sourceKeyLabel[this.source as SourceKey];
        if (this.source === "property") str += ":" + this.property;
        str += " " + logicKeyLabel[this.logic as LogicKey];
        str += " " + this.value;
        return str;
    }
}