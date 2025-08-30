import { App, Modal, Setting, TFile } from "obsidian";
import { FilesSuggester, t } from "src/internal";

export class FindPathModal extends Modal {
	private startNotePath: string = "";
	private endNotePath: string = "";
	private onSubmit: (startNotePath: string, endNotePath: string) => void;

	constructor(
		app: App,
		onSubmit: (startNotePath: string, endNotePath: string) => void
	) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: t("features.findPathBetweenNodes") });

		new Setting(contentEl)
			.setName(t("features.startNode"))
			.setDesc(t("features.startNodeDesc"))
			.addText((text) => {
				new FilesSuggester(text.inputEl, (value: string) => {
					text.setValue(value);
					this.startNotePath = value;
				});
				text.setPlaceholder(t("features.startNodePlaceholder"))
					.setValue(this.startNotePath)
					.onChange((value) => {
						this.startNotePath = value;
					});
			});

		new Setting(contentEl)
			.setName(t("features.endNode"))
			.setDesc(t("features.endNodeDesc"))
			.addText((text) => {
				new FilesSuggester(text.inputEl, (value: string) => {
					text.setValue(value);
					this.endNotePath = value;
				});
				text.setPlaceholder(t("features.endNodePlaceholder"))
					.setValue(this.endNotePath)
					.onChange((value) => {
						this.endNotePath = value;
					});
			});

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText(t("controls.findPath"))
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit(this.startNotePath, this.endNotePath);
				})
		);
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
