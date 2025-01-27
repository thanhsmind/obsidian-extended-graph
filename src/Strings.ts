export default class STRINGS {
	static features = {
		folders: "Folders",
		foldersDesc: "Display folder boxes",
		globalFilter: "Golbal filter",
		interactives: {
			colorLinks: "Color links",
			colorLinksDesc: "Add colors to the link rendered in the graph view.",
			curvedLinks: "Curved links",
			curvedLinksDesc: "Use curved links instead of straight lines",
			links: "Links",
			linksDesc: "Display and filter link types",
			noneTypeID: "None type id",
			noneTypeIDDesc: "The id which will be given if nothing is found for ",
			palette: "Color palette",
			paletteDesc: "Choose the color palette for ",
			selection: "Selection",
			selectionDesc: "Choose which values should be considered by the plugin",
			specificColors: "Specific colors",
			specificColorsDesc: "Choose specific colors to override the color palette",
		},
		removeSources: "Remove sources",
		removeSourcesDesc: "When disabling a link type, also disable the source nodes",
		removeTargets: "Remove targets",
		removeTargetsDesc: "When disabling a link type, also disable the source nodes",
		svgScreenshotCopy: "Copy SVG screenshot",
		zoomOnNode: "Zoom on node",
	}

    static states = {
        saveForDefaultState: "Save for default state",
        saveForDefaultStateDesc: "Save the current settings as the default state settings",
        saveForNormalState: "Save for normal state",
        saveForNormalStateDesc: "Save the current settings as the normal state settings (no plugin enabled)",
		showGraphState: "Show graph state"
    };

	static {
		STRINGS.localize();
	}

	/**
	 * Dynamically import strings for the current language.
	 */
	private static async localize(): Promise<void> {
		let localizedStrings: any;
		switch (window.localStorage.language) {
			case 'fr': localizedStrings = await import('i18n/fr.json'); break;
			default: return;
		}
		this.localizeDefaultStrings(this, localizedStrings);
	}

	/**
	 * Replace default strings with localized strings.
	 * Strings and their keys are always type-safe, even if the localized JSON is incomplete or broken.
	 */
	private static localizeDefaultStrings(defaultStrings: any, localizedStrings: any): void {
		for (const [key, value] of Object.entries(localizedStrings)) {
			if (typeof defaultStrings[key] === 'object') {
				if (typeof value === 'object') {
					this.localizeDefaultStrings(defaultStrings[key], value);
				}
			} else if (typeof value === 'string') {
				defaultStrings[key] = value;
			}
		}
	}
}