import { App, TFile } from "obsidian";
import { RuleQuery } from "./ruleQuery";

export type CombinationLogic = 'AND' | 'OR';
export type QueryData = {
    combinationLogic: CombinationLogic,
    rules: Record<string, string>[]
}

export class QueryMatcher {
    readonly queryData: QueryData;

    constructor(queryData: QueryData) {
        this.queryData = queryData;
    }

    getMatches(app: App): TFile[] {
        return app.vault.getMarkdownFiles().filter(file => this.doesMatch(app, file));
    }

    doesMatch(app: App, file: TFile): boolean {
        const validRules = this.queryData.rules.filter(rule => new RuleQuery(rule).isValid());
        if (validRules.length === 0) return false;
        switch (this.queryData.combinationLogic) {
            case 'AND':
                validRules.forEach(rule => console.log(new RuleQuery(rule).doesMatch(app, file)));
                return validRules.every(rule => new RuleQuery(rule).doesMatch(app, file) ?? false);
            case 'OR':
                return validRules.some(rule => new RuleQuery(rule).doesMatch(app, file) ?? false);
            default:
                break;
        }
        return false;
    }
}