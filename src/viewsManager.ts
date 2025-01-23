import { DEFAULT_VIEW_ID } from "./globalVariables";
import { Graph } from "./graph/graph";
import { GraphEventsDispatcher } from "./graph/graphEventsDispatcher";
import { InteractiveManager } from "./graph/interactiveManager";
import { GraphsManager } from "./graphsManager";
import { LegendUI } from "./ui/legendUI";
import { GraphView } from "./views/view";
import { GraphViewData } from "./views/viewData";

export class ViewsManager {
    graphsManager: GraphsManager;

    constructor(graphsManager: GraphsManager) {
        this.graphsManager = graphsManager;
    }

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
    
    /**
     * Change the current view with the specified ID.
     * @param id - The ID of the view to change to.
     */
    changeView(graph: Graph, id: string) {
        const viewData = this.getViewDataById(id);
        if (!viewData) return;

        this.updateInteractiveManagers(viewData, graph).then(() => {
            if (viewData.engineOptions) graph.engine.setOptions(viewData.engineOptions);
            graph.updateWorker();
            graph.nodesSet.setPinnedNodes(viewData.pinNodes ? viewData.pinNodes : {});
            graph.engine.updateSearch();
        });
    }
    
    private async updateInteractiveManagers(viewData: GraphViewData, graph: Graph): Promise<void> {
        new Promise(resolve => setTimeout(() => {
            this.updateManagers(viewData, graph.nodesSet.managers, graph.dispatcher.legendUI);
            this.updateManagers(viewData, graph.linksSet.managers, graph.dispatcher.legendUI);
        }, 200));
    }
    
    private updateManagers(viewData: GraphViewData, managers: Map<string, InteractiveManager>, legendUI: LegendUI | null): void {
        for (const [key, manager] of managers) {
            this.loadViewForInteractiveManager(manager, viewData);
            if (legendUI && viewData.disabledTypes) {
                legendUI.enableAll(key);
                if (viewData.disabledTypes.hasOwnProperty(key)) {
                    for (const type of viewData.disabledTypes[key]) {
                        legendUI.disable(key, type);
                    }
                }
            }
        }
    }
    
    /**
     * Deletes the view with the specified ID.
     * @param id - The ID of the view to delete.
     */
    deleteView(id: string): void {
        this.onViewNeedsDeletion(id);
    }

    private loadViewForInteractiveManager(manager: InteractiveManager, viewData: GraphViewData): void {
        if (!viewData.disabledTypes) return;
        const viewTypesToDisable: string[] = viewData.disabledTypes[manager.name];
        // Enable/Disable tags
        const toDisable: string[] = [];
        const toEnable: string[] = [];
        manager.getTypes().forEach(type => {
            const interactive = manager.interactives.get(type);
            if (!interactive) return;
            if (interactive.isActive && viewTypesToDisable?.includes(type)) {
                interactive.isActive = false;
                toDisable.push(type);
            }
            else if (!interactive.isActive && !viewTypesToDisable?.includes(type)) {
                interactive.isActive = true;
                toEnable.push(type);
            }
        });

        if (toDisable.length > 0) manager.dispatcher.onInteractivesDisabled(manager.name, toDisable);
        if (toEnable.length > 0) manager.dispatcher.onInteractivesEnabled(manager.name, toEnable);
    }


    onViewNeedsSaving(viewData: GraphViewData) {
        this.updateViewArray(viewData);
        this.graphsManager.plugin.saveSettings().then(() => {
            new Notice(`Extended Graph: view "${viewData.name}" has been saved`);
            this.updateAllViews();
        });
    }

    private updateViewArray(viewData: GraphViewData): void {
        const index = this.graphsManager.plugin.settings.views.findIndex(v => v.name === viewData.name);
        if (index >= 0) {
            this.graphsManager.plugin.settings.views[index] = viewData;
        }
        else {
            this.graphsManager.plugin.settings.views.push(viewData);
        }
    }

    onViewNeedsDeletion(id: string) {
        const view = this.getViewDataById(id);
        if (!view) return;
        this.graphsManager.plugin.settings.views.remove(view);
        this.graphsManager.plugin.saveSettings().then(() => {
            new Notice(`Extended Graph: view "${view.name}" has been removed`);
            this.updateAllViews();
        });
    }
    
    private updateAllViews(): void {
        this.graphsManager.dispatchers.forEach(dispatcher => {
            dispatcher.viewsUI.updateViewsList(this.graphsManager.plugin.settings.views);
        });
    }

    
    getViewDataById(id: string): GraphViewData | undefined {
        return this.graphsManager.plugin.settings.views.find(v => v.id === id);
    }
}