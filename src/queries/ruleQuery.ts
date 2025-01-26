import { App, TFile, TFolder } from "obsidian";
import { getFileInteractives, LINK_KEY, TAG_KEY } from "src/internal";

export type SourceKey = 'tag' | 'link' | 'property' | 'file' | 'folder' | 'folder_rec';
export type LogicKey = 'is' | 'isNot' | 'contains' | 'containsNot' | 'matchesRegex' | 'matchesRegexNot' | 'containsRegex' | 'containsRegexNot';

export const sourceKeyLabels: Record<SourceKey, string> = {
    'tag': 'Tags',
    'link': 'Links',
    'property': 'Property',
    'file': 'File',
    'folder': 'Folder',
    'folder_rec': 'Folder and subfolders'
}

export const logicKeyLabel: Record<LogicKey, string> = {
    'contains': "contains",
    'containsNot': "doesn't contain",
    'is': "is",
    'isNot': "is not",
    'containsRegex': "contains regex",
    'containsRegexNot': "doesn't contain regex",
    'matchesRegex': "matches regex",
    'matchesRegexNot': "doesn't match regex",
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

    getMatches(app: App): TFile[] {
        return app.vault.getMarkdownFiles().filter(file => this.doesMatch(app, file));
    }

    doesMatch(app: App, file: TFile): boolean | null {
        if (!this.isValid()) return null;
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
            
            case 'file':
                return this.checkLogic(file.basename);

            case 'folder':
                return this.checkLogic(folder);

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

    private checkLogic(values: string[] | string): boolean {
        const isArray = Array.isArray(values);
        const isString = typeof values === 'string';

        let fullWordRegex = this.value;
        if (!fullWordRegex.startsWith("\\b")) fullWordRegex = "\\b" + fullWordRegex;
        if (!fullWordRegex.endsWith("\\b"))   fullWordRegex = fullWordRegex + "\\b";

        if (isArray) {
            let valuesToCheck = values;
            switch ((this.logic as LogicKey)) {
                case 'is':
                    return valuesToCheck.length === 1 && values[0] === this.value;
                case 'isNot':
                    return valuesToCheck.length === 1 && values[0] !== this.value;
                case 'contains':
                    return isArray && valuesToCheck.contains(this.value);
                case 'containsNot':
                    return isArray && !valuesToCheck.contains(this.value);
                case 'matchesRegex':
                    return valuesToCheck.length === 1 && new RegExp(valuesToCheck[0]).test(fullWordRegex);
                case 'matchesRegexNot':
                    return valuesToCheck.length === 1 && !(new RegExp(valuesToCheck[0]).test(fullWordRegex));
                case 'containsRegex':
                    return isArray && valuesToCheck.some(v => new RegExp(v).test(this.value));
                case 'containsRegexNot':
                    return isArray && valuesToCheck.every(v => !(new RegExp(v).test(this.value)));
                default:
                    break;
            }
        }
        else if (isString) {
            let valueToCheck = (values as string);
            switch ((this.logic as LogicKey)) {
                case 'is':
                    return valueToCheck === this.value;
                case 'isNot':
                    return valueToCheck !== this.value;
                case 'contains':
                    return valueToCheck.contains(this.value);
                case 'containsNot':
                    return !valueToCheck.contains(this.value);
                case 'matchesRegex':
                    return new RegExp(valueToCheck).test(fullWordRegex);
                case 'matchesRegexNot':
                    return !(new RegExp(valueToCheck).test(fullWordRegex));
                case 'containsRegex':
                    return new RegExp(valueToCheck).test(this.value);
                case 'containsRegexNot':
                    return !(new RegExp(valueToCheck).test(this.value));
                default:
                    break;
            }
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
        let str = sourceKeyLabels[this.source as SourceKey];
        if (this.source === "property") str += ":" + this.property;
        str += " " + logicKeyLabel[this.logic as LogicKey];
        str += " " + this.value;
        return str;
    }
}