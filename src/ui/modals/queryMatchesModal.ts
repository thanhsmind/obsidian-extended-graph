import { App, Modal, Setting, TFile } from "obsidian";
import { QueryData, QueryMatcher } from "src/internal";

export class QueryMatchesModal extends Modal {
    matcher: QueryMatcher;

    constructor(app: App, queryData: QueryData) {
        super(app);

        this.matcher = new QueryMatcher(queryData);
        const files = this.matcher.getMatches(this.app);

        this.setTitle("Matching files");

        this.addQueryStringHeader();
        this.addQueryString();

        this.addFilesHeader(files.length);
        for (const file of files) {
            this.addFile(file);
        }
    }

    private addQueryStringHeader(): void {
        new Setting(this.contentEl)
            .setName("Query")
            .setHeading();
    }

    private addQueryString(): void {
        new Setting(this.contentEl)
            .setName(this.matcher.toString());
    }

    private addFilesHeader(n: number): void {
        new Setting(this.contentEl)
            .setName(`Files (${n})`)
            .setHeading();
    }

    private addFile(file: TFile): void {
        new Setting(this.contentEl)
            .setName(file.path);
    }
}