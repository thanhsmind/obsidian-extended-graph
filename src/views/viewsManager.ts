import { DEFAULT_VIEW_ID, FOLDER_KEY, Graph, GraphsManager, GraphView, GraphViewData, InteractiveManager, InteractiveUI } from "src/internal";



export class ViewsManager {
    graphsManager: GraphsManager;

    constructor(graphsManager: GraphsManager) {
        this.graphsManager = graphsManager;
    }

    // ================================ GETTERS ================================
    
    getViewDataById(id: string): GraphViewData | undefined {
        return this.graphsManager.plugin.settings.views.find(v => v.id === id);
    }

    // ============================== CREATE VIEW ==============================

    /**
     * Creates a new view with the specified name from the current graph.
     * @param graph - The current graph.
     * @param name - The name of the new view.
     * @returns string - The ID of the new view.
     */
    newView(graph: Graph, name: string): string {
        const view = new GraphView(name);
        view.setID();
        view.saveGraph(graph);
        this.onViewNeedsSaving(view.data);
        return view.data.id;
    }

    // ============================== CHANGE VIEW ==============================
    
    /**
     * Change the current view with the specified ID.
     * @param id - The ID of the view to change to.
     */
    changeView(graph: Graph, id: string) {
        let viewData = this.getViewDataById(id);
        if (!viewData) return;

        viewData = this.validateViewData(viewData);
        this.updateInteractiveManagers(viewData, graph).then(() => {
            if (viewData.engineOptions) graph.engine.setOptions(viewData.engineOptions);
            graph.updateWorker();
            graph.nodesSet.setPinnedNodes(viewData.pinNodes ? viewData.pinNodes : {});
            graph.engine.updateSearch();
        });
    }

    private validateViewData(viewData: GraphViewData): GraphViewData {
        const view = new GraphView(viewData.name);
        const hasChanged = view.saveView(viewData);
        if (hasChanged) {
            this.onViewNeedsSaving(view.data);
        }
        return view.data;
    }
    
    private async updateInteractiveManagers(viewData: GraphViewData, graph: Graph): Promise<void> {
        new Promise(resolve => setTimeout(() => {
            this.updateManagers(viewData, graph.nodesSet.managers, graph.dispatcher.legendUI);
            this.updateManagers(viewData, graph.linksSet.managers, graph.dispatcher.legendUI);
            this.updateManagers(viewData, graph.folderBlobs.managers, graph.dispatcher.foldersUI);
        }, 200));
    }
    
    private updateManagers(viewData: GraphViewData, managers: Map<string, InteractiveManager>, interactiveUI: InteractiveUI | null): void {
        for (const [key, manager] of managers) {
            if (!this.graphsManager.plugin.settings.interactiveSettings[key].hasOwnProperty('enableByDefault')) {
                this.graphsManager.plugin.settings.interactiveSettings[key].enableByDefault = key !== FOLDER_KEY;
                this.graphsManager.plugin.saveSettings();
            }
            const enableByDefault = this.graphsManager.plugin.settings.interactiveSettings[key].enableByDefault;
            this.loadViewForInteractiveManager(manager, viewData);
            if (interactiveUI && viewData.toggleTypes) {
                if (enableByDefault) interactiveUI.enableAllUI(key);
                else interactiveUI.disableAllUI(key);
                if (viewData.toggleTypes.hasOwnProperty(key)) {
                    for (const type of viewData.toggleTypes[key]) {
                        if (enableByDefault) interactiveUI.disableUI(key, type);
                        else interactiveUI.enableUI(key, type);
                    }
                }
            }
        }
    }

    private loadViewForInteractiveManager(manager: InteractiveManager, viewData: GraphViewData): void {
        if (!viewData.toggleTypes) return;
        const enableByDefault = this.graphsManager.plugin.settings.interactiveSettings[manager.name].enableByDefault;
        const viewTypesToToggle: string[] = viewData.toggleTypes[manager.name] ?? [];
        const toDisable: string[] = [];
        const toEnable: string[] = [];
        manager.getTypes().forEach(type => {
            const interactive = manager.interactives.get(type);
            if (!interactive) return;
            // Type should be toggled (not default)
            if ((enableByDefault === interactive.isActive) && viewTypesToToggle.includes(type)) {
                interactive.isActive = !enableByDefault;
                if (enableByDefault) toDisable.push(type);
                else toEnable.push(type);
            }
            // Type should be default
            else if ((enableByDefault !== interactive.isActive) && !viewTypesToToggle.includes(type)) {
                interactive.isActive = enableByDefault;
                if (enableByDefault) toEnable.push(type);
                else toDisable.push(type);
            }
        });

        if (toDisable.length > 0) manager.dispatcher.onInteractivesDisabled(manager.name, toDisable);
        if (toEnable.length > 0) manager.dispatcher.onInteractivesEnabled(manager.name, toEnable);
    }

    // =============================== SAVE VIEW ===============================

    /**
     * Saves the current graph in the view with the specified ID.
     * @param graph - The current graph.
     * @param id - The ID of the view to save.
     */
    saveView(graph: Graph, id: string): void {
        if (id === DEFAULT_VIEW_ID) return;
        const viewData = this.graphsManager.plugin.settings.views.find(v => v.id == id);
        if (!viewData) return;
        const view = new GraphView(viewData?.name);
        view.setID(id);
        view.saveGraph(graph);
        this.onViewNeedsSaving(view.data);
    }

    onViewNeedsSaving(viewData: GraphViewData) {
        this.updateViewArray(viewData);
        this.graphsManager.plugin.saveSettings().then(() => {
            new Notice(`Extended Graph: view "${viewData.name}" has been saved`);
            this.updateAllViews();
        });
    }

    // ============================== UPDATE VIEW ==============================

    private updateViewArray(viewData: GraphViewData): void {
        const index = this.graphsManager.plugin.settings.views.findIndex(v => v.name === viewData.name);
        if (index >= 0) {
            this.graphsManager.plugin.settings.views[index] = viewData;
        }
        else {
            this.graphsManager.plugin.settings.views.push(viewData);
        }
    }
    
    private updateAllViews(): void {
        this.graphsManager.dispatchers.forEach(dispatcher => {
            dispatcher.viewsUI.updateViewsList(this.graphsManager.plugin.settings.views);
        });
    }

    // ============================== DELETE VIEW ==============================
    
    /**
     * Deletes the view with the specified ID.
     * @param id - The ID of the view to delete.
     */
    deleteView(id: string): void {
        const view = this.getViewDataById(id);
        if (!view) return;
        this.graphsManager.plugin.settings.views.remove(view);
        this.graphsManager.plugin.saveSettings().then(() => {
            new Notice(`Extended Graph: view "${view.name}" has been removed`);
            this.updateAllViews();
        });
    }
}