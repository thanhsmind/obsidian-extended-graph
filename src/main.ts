import { addIcon, getIcon, MarkdownView, Plugin, View, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, ExtendedGraphSettingTab, FOLDER_KEY, getFolderStyle, getGraphBannerClass, getGraphBannerPlugin, getIconicPlugin, getNodeTextStyle, GraphsManager, hasEngine, INVALID_KEYS, isGraphBannerLoaded, LINK_KEY, PluginInstances, ProxysManager, StatesManager, TAG_KEY } from './internal';
import { re } from 'mathjs';

// https://pixijs.download/v7.4.2/docs/index.html

export default class ExtendedGraphPlugin extends Plugin {
    waitingTime: number = 0;

    // ================================ LOADING ================================

    async onload(): Promise<void> {
        PluginInstances.plugin = this;
        PluginInstances.app = this.app;
        PluginInstances.proxysManager = new ProxysManager();
        await this.loadSettings();

        addIcon("git-fork-sparkles", `<g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" class="git-fork-sparkles"><circle cx="50" cy="76" r="12"/><circle cx="25" cy="25" r="12"/><circle cx="76" cy="25" r="12"/><path d="M76 36v8c0 2.4-1.6 4-4 4H28c-2.4 0-4-1.6-4-4V36"/><path d="M50 50v12"/><path d="m 82.03746,54.745552 v 16"/><path d="m 90.03746,62.745552  h -16"/><path d="m 72.5023,80.767008 v 8"/><path d="m 76.5023,84.767008 h -8"/><path d="m 14.7461264,54.15018 v 8"/><path d="m 18.7461264,58.15018 h -8"/></g>`);
        this.createPinIconUrl();

        this.initializeInvalidKeys();
        this.addSettingTab(new ExtendedGraphSettingTab(this));

        this.registerEvent(this.app.workspace.on('layout-ready', () => {
            this.getStylingFromCSSBridge();
            this.loadGraphsManager();
            this.onLayoutChange();
        }));

        this.registerEvent(
            this.app.workspace.on('file-open', async (file) => {
                if (!isGraphBannerLoaded()) return;

                if (!file || file.extension !== "md") return;

                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (!view || view.file !== file) return;

                this.onMarkdownViewOpen(view);
            }),
        );
    }

    private initializeInvalidKeys(): void {
        for (const key of Object.keys(PluginInstances.settings.additionalProperties)) {
            INVALID_KEYS[key] = [];
        }
    }

    private loadGraphsManager() {
        PluginInstances.graphsManager = new GraphsManager();
        PluginInstances.statesManager = new StatesManager();
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

    getStylingFromCSSBridge() {
        PluginInstances.nodeTextStyle = getNodeTextStyle();
        PluginInstances.folderStyle = getFolderStyle();
    }

    // =============================== UNLOADING ===============================

    onunload() {
    }

    // ================================ SETTINGS ===============================

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
        // Remove invalid shallow keys
        for (const key in data) {
            if (!DEFAULT_SETTINGS.hasOwnProperty(key)) {
                delete data[key];
            }
        }
        // Deep load default settings
        this.loadSettingsRec(DEFAULT_SETTINGS, data);
        PluginInstances.settings = data;
    }

    private migrateSettings(settings: any): any {
        if (!settings) return DEFAULT_SETTINGS;
        if (typeof settings !== "object") return DEFAULT_SETTINGS;

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

        return settings;
    }

    private completeDefaultSettings() {
        DEFAULT_SETTINGS.interactiveSettings[TAG_KEY] = {
            colormap: "hsv",
            colors: [],
            unselected: [],
            noneType: "none",
            showOnGraph: true,
            enableByDefault: true,
        };

        DEFAULT_SETTINGS.interactiveSettings[LINK_KEY] = {
            colormap: "rainbow",
            colors: [],
            unselected: [],
            noneType: "none",
            showOnGraph: true,
            enableByDefault: true,
        };

        DEFAULT_SETTINGS.interactiveSettings[FOLDER_KEY] = {
            colormap: "winter",
            colors: [],
            unselected: [],
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

    // ============================= LAYOUT CHANGE =============================

    async onLayoutChange() {
        if (!this.app.internalPlugins.getPluginById("graph")?._loaded) return;
        this.waitingTime = 0;

        try {
            const found = await this.waitForRenderer();
            const leaves = found ? this.getAllGraphLeaves() : [];
            PluginInstances.graphsManager.syncWithLeaves(leaves);
            leaves.forEach(leaf => {
                PluginInstances.graphsManager.onNewLeafOpen(leaf);
            });
        } catch (e) {
            console.error(e);
        }
    }

    private waitForRenderer(): Promise<boolean> {
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                this.waitingTime += 200;
                if (this.isGraphOpen()) {
                    this.clearWaitInterval(intervalId, resolve, true);
                }
                else if (this.waitingTime > 500) {
                    this.clearWaitInterval(intervalId, resolve, false);
                }
            }, 100);
        });
    }

    private clearWaitInterval(intervalId: NodeJS.Timeout, resolve: (value: boolean) => void, result: boolean): void {
        clearInterval(intervalId);
        this.waitingTime = 0;
        resolve(result);
    }

    private isGraphOpen(): boolean {
        if (this.app.workspace.getLeavesOfType('graph').find(leaf => this.isGraph(leaf))) return true;
        if (this.app.workspace.getLeavesOfType('localgraph').find(leaf => this.isGraph(leaf))) return true;
        if (getGraphBannerPlugin()?.graphViews.find(v => this.isGraph(v.leaf))) return true;
        return false;
    }

    private getAllGraphLeaves(): WorkspaceLeaf[] {
        let leaves: WorkspaceLeaf[] = [];
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('graph').filter(leaf => this.isGraph(leaf)));
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('localgraph').filter(leaf => this.isGraph(leaf)));
        leaves = leaves.concat(getGraphBannerPlugin()?.graphViews.map(v => v.leaf) || []);
        return [...(new Set(leaves))];
    }

    private isGraph(leaf: WorkspaceLeaf): boolean {
        return leaf.view instanceof View && leaf.view._loaded && hasEngine(leaf);
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

