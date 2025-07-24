import { addIcon, getIcon, ItemView, MarkdownView, normalizePath, Plugin, WorkspaceLeaf } from 'obsidian';
import { GraphView, LocalGraphView } from "obsidian-typings";
import {
    addCommands,
    DEFAULT_SETTINGS,
    ExtendedGraphSettingTab,
    FOLDER_KEY,
    getGraphBannerClass,
    getGraphBannerPlugin,
    GraphsManager,
    INVALID_KEYS,
    isGraphBannerLoaded,
    LINK_KEY,
    Pinner,
    PluginInstances,
    ProxysManager,
    rgb2hex,
    StatesManager,
    t,
    TAG_KEY
} from './internal';

// https://pixijs.download/v7.4.2/docs/index.html

export default class ExtendedGraphPlugin extends Plugin {

    // ================================ LOADING ================================

    async onload(): Promise<void> {
        await this.checkDataValidity();

        PluginInstances.plugin = this;
        PluginInstances.app = this.app;
        PluginInstances.configurationDirectory = normalizePath(this.manifest.dir + "/configs/");
        PluginInstances.proxysManager = new ProxysManager();
        await this.loadSettings();

        addIcon("git-fork-sparkles", `<g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" class="git-fork-sparkles"><circle cx="50" cy="76" r="12"/><circle cx="25" cy="25" r="12"/><circle cx="76" cy="25" r="12"/><path d="M76 36v8c0 2.4-1.6 4-4 4H28c-2.4 0-4-1.6-4-4V36"/><path d="M50 50v12"/><path d="m 82.03746,54.745552 v 16"/><path d="m 90.03746,62.745552  h -16"/><path d="m 72.5023,80.767008 v 8"/><path d="m 76.5023,84.767008 h -8"/><path d="m 14.7461264,54.15018 v 8"/><path d="m 18.7461264,58.15018 h -8"/></g>`);
        this.createPinIconUrl();

        this.initializeInvalidKeys();
        this.addSettingTab(new ExtendedGraphSettingTab(this));

        PluginInstances.graphsManager = new GraphsManager();
        PluginInstances.statesManager = new StatesManager();

        this.app.workspace.onLayoutReady(() => {
            this.loadGraphsManager();
            this.onLayoutChange();
        });

        this.registerEvent(
            this.app.workspace.on('file-open', async (file) => {
                if (!isGraphBannerLoaded()) return;

                if (!file || file.extension !== "md") return;

                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (!view || view.file !== file) return;

                this.onMarkdownViewOpen(view);
            }),
        );

        addCommands(this);
    }

    private initializeInvalidKeys(): void {
        for (const key of Object.keys(PluginInstances.settings.additionalProperties)) {
            INVALID_KEYS[key] = [];
        }
    }

    private loadGraphsManager() {
        this.addChild(PluginInstances.graphsManager);
        PluginInstances.graphsManager.load();
    }

    private createPinIconUrl() {
        const bodyStyle = getComputedStyle(document.body);
        const stroke = bodyStyle.getPropertyValue("--color-base-00");

        const svg = getIcon("pin");
        if (svg) {
            const tail = svg.getElementsByTagName("path")[0];
            const head = svg.getElementsByTagName("path")[1];
            head.setAttribute("fill", PluginInstances.app.getAccentColor());
            head.setAttribute("stroke", stroke);
            tail.setAttribute("stroke", PluginInstances.app.getAccentColor());

            const s = new XMLSerializer();
            PluginInstances.pinSVGDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.serializeToString(svg))}`
        }
    }

    // =============================== UNLOADING ===============================

    onunload() {
    }

    // ================================ SETTINGS ===============================

    private async checkDataValidity() {
        const dataPath = normalizePath((this.manifest.dir ?? "") + "/data.json");
        try {
            JSON.parse(await this.app.vault.adapter.read(dataPath));
        } catch (error) {
            const message = `There is an error in the settings file ${dataPath}, the json file can not be parsed. Please, make a copy of your file and report it on the GitHub repo, with the copy attached. Then, you can try to fix the file by hand, or fully delete the content of ${dataPath} and start using the plugin again (but you will lose your settings). I apologize for the inconvenience.`;
            new Notice(message, 0);
            console.warn(message);
            throw error;
        }
    }

    async loadSettings() {
        let data = await this.loadData();
        // Comlete default settings
        this.completeDefaultSettings();
        // Migrate
        if (data) {
            data = this.migrateSettings(data);
        }
        else {
            data = DEFAULT_SETTINGS;
        }

        // Deep load default settings
        this.loadSettingsRec(DEFAULT_SETTINGS, data);
        PluginInstances.settings = data;
    }

    private migrateSettings(settings: any): any {
        if (!settings) return DEFAULT_SETTINGS;
        if (typeof settings !== "object") return DEFAULT_SETTINGS;

        // Remove invalid shallow keys
        for (const key in settings) {
            if (!DEFAULT_SETTINGS.hasOwnProperty(key)) {
                delete settings[key];
            }
        }

        // 2.2.3 --> 2.2.4
        if ("additionalProperties" in settings && typeof settings["additionalProperties"] === "object") {
            for (const key of Object.keys(settings["additionalProperties"])) {
                if (typeof settings["additionalProperties"][key] === "boolean") {
                    const enable = settings["additionalProperties"][key];
                    settings["additionalProperties"][key] = {
                        'graph': enable,
                        'localgraph': enable,
                    }
                }
            }
        }

        if (!("enableFeatures" in settings)) {
            settings['enableFeatures'] = {
                'graph': {},
                'localgraph': {},
            };
        }

        if ("linksSameColorAsNode" in settings) {
            settings['enableFeatures']['graph']["linksSameColorAsNode"] = settings['linksSameColorAsNode'];
            settings['enableFeatures']['localgraph']["linksSameColorAsNode"] = settings['linksSameColorAsNode'];
            delete settings['linksSameColorAsNode'];
        }

        if ("enableFeatures" in settings) {
            if ("curvedLinks" in settings['enableFeatures']['graph']) {
                settings["curvedLinks"] = settings['enableFeatures']['graph']["curvedLinks"];
            }
            delete settings['enableFeatures']['graph']["curvedLinks"];
            delete settings['enableFeatures']['localgraph']["curvedLinks"];
        }

        if ("source" in settings['enableFeatures']['graph']) {
            settings["disableSource"] = settings['enableFeatures']['graph']["source"];
            delete settings['enableFeatures']['graph']["source"];
            delete settings['enableFeatures']['localgraph']["source"];
        }
        if ("target" in settings['enableFeatures']['graph']) {
            settings["disableTarget"] = settings['enableFeatures']['graph']["target"];
            delete settings['enableFeatures']['graph']["target"];
            delete settings['enableFeatures']['localgraph']["target"];
        }

        // 2.2.5 --> 2.2.6
        if ('collapsedSettings' in settings && "property-key" in settings['collapsedSettings']) {
            delete settings['collapsedSettings']["property-key"];
        }

        // 2.3.0 --> 2.4.0
        if ("iconProperty" in settings) {
            if (!('iconProperties' in settings)) {
                settings['iconProperties'] = [];
            }
            if (!settings['iconProperties'].contains(settings["iconProperty"]))
                settings['iconProperties'].push(settings["iconProperty"]);
            delete settings["iconProperty"];
        }
        if ("nodesSizeProperty" in settings) {
            if (!('nodesSizeProperties' in settings)) {
                settings['nodesSizeProperties'] = [];
            }
            if (!settings['nodesSizeProperties'].contains(settings["nodesSizeProperty"]))
                settings['nodesSizeProperties'].push(settings["nodesSizeProperty"]);
            delete settings["nodesSizeProperty"];
        }
        if ("imageProperty" in settings) {
            if (!('imageProperties' in settings)) {
                settings['imageProperties'] = [];
            }
            if (!settings['imageProperties'].contains(settings["imageProperty"]))
                settings['imageProperties'].push(settings["imageProperty"]);
            delete settings["imageProperty"];
        }
        if ("usePropertyForName" in settings) {
            if (!('usePropertiesForName' in settings)) {
                settings['usePropertiesForName'] = [];
            }
            if (settings["usePropertyForName"] && !settings['usePropertiesForName'].contains(settings["usePropertyForName"]))
                settings['usePropertiesForName'].push(settings["usePropertyForName"]);
            delete settings["usePropertyForName"];
        }

        // 2.4.2 --> 2.4.4
        if ("interactiveSettings" in settings) {
            if (typeof settings["interactiveSettings"] === "object") {
                for (const key of Object.keys(settings["interactiveSettings"])) {
                    if (!('excludeRegex' in settings["interactiveSettings"][key]) || typeof settings["interactiveSettings"][key]['excludeRegex'] !== "object") {
                        settings["interactiveSettings"][key]['excludeRegex'] = {
                            "regex": "",
                            "flags": ""
                        }
                    }
                }
            }
            else {
                settings["interactiveSettings"] = {};
            }
        }

        // 2.4.7 --> 2.4.8
        if (typeof settings["customColorMaps"] === "object") {
            for (const name in settings["customColorMaps"]) {
                if (Array.isArray(settings["customColorMaps"][name]['colors'])) {
                    for (const i in settings["customColorMaps"][name]['colors']) {
                        const col = settings["customColorMaps"][name]['colors'][i];
                        if (Array.isArray(col)) {
                            if (col.every(c => typeof c === "number")) {
                                settings["customColorMaps"][name]['colors'][i] = rgb2hex(col.map(c => Math.round(c * 255)));
                            }
                            else {
                                settings["customColorMaps"][name]['colors'][i] = "#000000";
                            }
                        }
                    }
                }
            }
        }

        return settings;
    }

    private completeDefaultSettings() {
        DEFAULT_SETTINGS.interactiveSettings[TAG_KEY] = {
            colormap: "hsv",
            colors: [],
            unselected: [],
            excludeRegex: { regex: "", flags: "" },
            noneType: "none",
            showOnGraph: true,
            enableByDefault: true,
        };

        DEFAULT_SETTINGS.interactiveSettings[LINK_KEY] = {
            colormap: "rainbow",
            colors: [],
            unselected: [],
            excludeRegex: { regex: "", flags: "" },
            noneType: "none",
            showOnGraph: true,
            enableByDefault: true,
        };

        DEFAULT_SETTINGS.interactiveSettings[FOLDER_KEY] = {
            colormap: "winter",
            colors: [],
            unselected: [],
            excludeRegex: { regex: "", flags: "" },
            noneType: ".",
            showOnGraph: true,
            enableByDefault: false,
        };
    }

    private loadSettingsRec(defaultSettings: any, userSettings: any) {
        if (!defaultSettings || typeof defaultSettings !== 'object' || Array.isArray(defaultSettings)) {
            return;
        }
        if (!userSettings || typeof userSettings !== 'object' || Array.isArray(userSettings)) {
            return;
        }
        // Complete settings
        for (const key in defaultSettings) {
            // Add settings
            if (!userSettings.hasOwnProperty(key)) {
                userSettings[key] = defaultSettings[key];
            }
            // Or recursively complete settings
            else {
                this.loadSettingsRec(defaultSettings[key], userSettings[key]);
            }
        }
    }

    async saveSettings() {
        await this.saveData(PluginInstances.settings);
    }

    async importSettings(filepath: string): Promise<void> {
        filepath = normalizePath(filepath);
        const data = await this.app.vault.adapter.read(filepath);
        let json = JSON.parse(data);

        json = this.migrateSettings(json);
        this.loadSettingsRec(PluginInstances.settings, json);

        PluginInstances.settings = json;
        await this.saveSettings();
    }

    async exportSettings(filepath: string): Promise<void> {
        this.app.vault.adapter.mkdir(PluginInstances.configurationDirectory);
        filepath = normalizePath(filepath);

        const settings = structuredClone(PluginInstances.settings) as Partial<typeof PluginInstances.settings>;

        // Remove settings that are internal (not set by the user)
        delete settings.collapseState;
        delete settings.collapseLegend;
        delete settings.resetAfterChanges;
        delete settings.collapsedSettings;
        delete settings.multipleNodesData;

        const data = JSON.stringify(PluginInstances.settings, null, 2);
        await this.app.vault.adapter.write(filepath, data);
    }

    // ============================= LAYOUT CHANGE =============================

    async onLayoutChange() {
        if (!this.app.internalPlugins.getPluginById("graph")?._loaded) return;
        const leaves = this.getGraphLeaves();
        PluginInstances.graphsManager.syncWithLeaves(leaves);
        leaves.forEach(leaf => {
            PluginInstances.graphsManager.initLeaf(leaf);
        });
    }

    private getGraphLeaves(): WorkspaceLeaf[] {
        let leaves: WorkspaceLeaf[] = [];
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('graph'));
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('localgraph'));
        leaves = leaves.concat(getGraphBannerPlugin()?.graphViews.map(v => v.leaf) || []);
        return [...(new Set(leaves))];
    }

    private onMarkdownViewOpen(view: MarkdownView): void {
        // Select the node that will be observed for mutations
        const targetNode = view.contentEl;

        // Options for the observer (which mutations to observe)
        const config = { attributes: true, childList: true, subtree: true };

        // Callback function to execute when mutations are observed
        const callback: MutationCallback = (mutationList, observer) => {
            for (const mutation of mutationList) {
                if (mutation.type === "childList") {
                    if (mutation.addedNodes.length > 0) {
                        if ((mutation.addedNodes[0] as HTMLElement).classList?.contains(getGraphBannerClass())) {
                            this.onLayoutChange();
                            /*const leaf = getGraphBannerPlugin()?.graphViews.find(v => v.node === mutation.addedNodes[0])?.leaf;
                            if (leaf && this.isGraph(leaf)) {
                                PluginInstances.graphsManager.onNewLeafOpen(leaf);
                            }*/
                        }
                    }
                }
            }
        };

        // Create an observer instance linked to the callback function
        const observer = new MutationObserver(callback);

        // Start observing the target node for configured mutations
        observer.observe(targetNode, config);

        // Stop observing after 2 seconds
        setTimeout(() => {
            observer.disconnect();
        }, 2000);
    }
}

