import { App, Modal, Setting, TFile } from "obsidian";
import { QueryData, QueryMatcher } from "src/internal";
import STRINGS from "src/Strings";

export class QueryMatchesModal extends Modal {
    matcher: QueryMatcher;

    constructor(app: App, queryData: QueryData) {
        super(app);

        this.matcher = new QueryMatcher(queryData);
        const files = this.matcher.getMatches(this.app);

        this.setTitle(STRINGS.query.matchingFiles);

        this.addQueryStringHeader();
        this.addQueryString();

        this.addFilesHeader(files.length);
        for (const file of files) {
            this.addFile(file);
        }
    }

    private addQueryStringHeader(): void {
        new Setting(this.contentEl)
            .setName(STRINGS.query.query)
            .setHeading();
    }

    private addQueryString(): void {
        new Setting(this.contentEl)
            .setName(this.matcher.toString());
    }

    private addFilesHeader(n: number): void {
        new Setting(this.contentEl)
            .setName(`${STRINGS.query.files} (${n})`)
            .setHeading();
    }

    private addFile(file: TFile): void {
        new Setting(this.contentEl)
            .setName(file.path);
    }
}