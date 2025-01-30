import { Menu, Plugin, TAbstractFile, View, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, ExtendedGraphSettings, ExtendedGraphSettingTab, FOLDER_KEY, GraphsManager, hasEngine, INVALID_KEYS, LINK_KEY, PluginInstances, StatesManager, TAG_KEY, WorkspaceExt, WorkspaceLeafExt } from './internal';
// https://pixijs.download/v7.4.2/docs/index.html

export default class ExtendedGraphPlugin extends Plugin {
    waitingTime: number = 0;

    // ================================ LOADING ================================

    async onload(): Promise<void> {
        PluginInstances.plugin = this;
        PluginInstances.app = this.app;
        await this.loadSettings();

        this.initializeInvalidKeys();
        this.addSettingTab(new ExtendedGraphSettingTab(this.app, this));

        this.registerEvent(this.app.workspace.on('layout-ready', () => {
            this.loadGraphsManager();
            this.registerEvents();
            this.onLayoutChange();
        }));
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

    private registerEvents() {
        this.registerEvent(this.app.workspace.on('layout-change', () => {
            if (!this.isCoreGraphLoaded()) return;
            this.onLayoutChange();
        }));
        this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => {
            if (!this.isCoreGraphLoaded()) return;
            PluginInstances.graphsManager.onActiveLeafChange(leaf);
        }));


        this.registerEvent((this.app.workspace as WorkspaceExt).on('extended-graph:settings-colorpalette-changed', (key: string) => {
            if (!this.isCoreGraphLoaded()) return;
            PluginInstances.graphsManager.updatePaletteForInteractive(key);
        }));
        this.registerEvent((this.app.workspace as WorkspaceExt).on('extended-graph:settings-interactive-color-changed', (key: string, type: string) => {
            if (!this.isCoreGraphLoaded()) return;
            PluginInstances.graphsManager.updateColorForInteractiveType(key, type);
        }));

        this.registerEvent(this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile, source: string, leaf?: WorkspaceLeaf) => {
            if (!this.isCoreGraphLoaded()) return;
            PluginInstances.graphsManager.onNodeMenuOpened(menu, file, source, leaf);
        }));

    }

    private isCoreGraphLoaded(): boolean {
        return !!this.app.internalPlugins.getPluginById("graph")?._loaded;
    }

    // =============================== UNLOADING ===============================

    onunload() {
    }

    // ================================ SETTINGS ===============================

    async loadSettings() {
        const data = await this.loadData();
        // Comlete default settings
        this.completeDefaultSettings();
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
            const leaves = found ? this.getAllGraphLeaves(): [];
            PluginInstances.graphsManager.syncWithLeaves(leaves);
            leaves.forEach(leaf => {
                PluginInstances.graphsManager.onNewLeafOpen(leaf as WorkspaceLeafExt);
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

    private clearWaitInterval(intervalId: NodeJS.Timer, resolve: (value: boolean) => void, result: boolean): void {
        clearInterval(intervalId);
        this.waitingTime = 0;
        resolve(result);
    }

    private isGraphOpen(): boolean {
        if (this.app.workspace.getLeavesOfType('graph').find(leaf => this.isGraph(leaf))) return true;
        if (this.app.workspace.getLeavesOfType('localgraph').find(leaf => this.isGraph(leaf))) return true;
        return false;
    }

    private getAllGraphLeaves(): WorkspaceLeaf[] {
        let leaves: WorkspaceLeaf[] = [];
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('graph').filter(leaf => this.isGraph(leaf)));
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('localgraph').filter(leaf => this.isGraph(leaf)));
        return leaves;
    }

    private isGraph(leaf: WorkspaceLeaf): boolean {
        return leaf.view instanceof View && leaf.view._loaded && hasEngine(leaf as WorkspaceLeafExt);
    }
}

