import { DEFAULT_STATE_ID, FOLDER_KEY, Graph, GraphsManager, GraphState, GraphStateData, InteractiveManager, InteractiveUI } from "src/internal";
import STRINGS from "src/Strings";



export class StatesManager {
    graphsManager: GraphsManager;

    constructor(graphsManager: GraphsManager) {
        this.graphsManager = graphsManager;
    }

    // ================================ GETTERS ================================
    
    getStateDataById(id: string): GraphStateData | undefined {
        return this.graphsManager.plugin.settings.states.find(v => v.id === id);
    }

    // ============================= CREATE STATE ==============================

    /**
     * Creates a new state with the specified name from the current graph.
     * @param graph - The current graph.
     * @param name - The name of the new state.
     * @returns string - The ID of the new state.
     */
    newState(graph: Graph, name: string): string {
        const state = new GraphState(name);
        state.setID();
        state.saveGraph(graph);
        this.onStateNeedsSaving(state.data);
        return state.data.id;
    }

    // ============================= CHANGE STATE ==============================
    
    /**
     * Change the current state with the specified ID.
     * @param id - The ID of the state to change to.
     */
    changeState(graph: Graph, id: string) {
        let stateData = this.getStateDataById(id);
        if (!stateData) return;

        stateData = this.validateStateData(stateData);
        this.updateInteractiveManagers(stateData, graph).then(() => {
            if (stateData.engineOptions) graph.engine.setOptions(stateData.engineOptions);
            graph.updateWorker();
            graph.nodesSet.setPinnedNodes(stateData.pinNodes ? stateData.pinNodes : {});
            graph.engine.updateSearch();
        });
    }

    private validateStateData(stateData: GraphStateData): GraphStateData {
        const state = new GraphState(stateData.name);
        const hasChanged = state.saveState(stateData);
        if (hasChanged) {
            this.onStateNeedsSaving(state.data);
        }
        return state.data;
    }
    
    private async updateInteractiveManagers(stateData: GraphStateData, graph: Graph): Promise<void> {
        new Promise(resolve => setTimeout(() => {
            this.updateManagers(stateData, graph.nodesSet.managers, graph.dispatcher.legendUI);
            this.updateManagers(stateData, graph.linksSet.managers, graph.dispatcher.legendUI);
            this.updateManagers(stateData, graph.folderBlobs.managers, graph.dispatcher.foldersUI);
        }, 200));
    }
    
    private updateManagers(stateData: GraphStateData, managers: Map<string, InteractiveManager>, interactiveUI: InteractiveUI | null): void {
        for (const [key, manager] of managers) {
            if (!this.graphsManager.plugin.settings.interactiveSettings[key].hasOwnProperty('enableByDefault')) {
                this.graphsManager.plugin.settings.interactiveSettings[key].enableByDefault = key !== FOLDER_KEY;
                this.graphsManager.plugin.saveSettings();
            }
            const enableByDefault = this.graphsManager.plugin.settings.interactiveSettings[key].enableByDefault;
            this.loadStateForInteractiveManager(manager, stateData);
            if (interactiveUI && stateData.toggleTypes) {
                if (enableByDefault) interactiveUI.enableAllUI(key);
                else interactiveUI.disableAllUI(key);
                if (stateData.toggleTypes.hasOwnProperty(key)) {
                    for (const type of stateData.toggleTypes[key]) {
                        if (enableByDefault) interactiveUI.disableUI(key, type);
                        else interactiveUI.enableUI(key, type);
                    }
                }
            }
        }
    }

    private loadStateForInteractiveManager(manager: InteractiveManager, stateData: GraphStateData): void {
        if (!stateData.toggleTypes) return;
        const enableByDefault = this.graphsManager.plugin.settings.interactiveSettings[manager.name].enableByDefault;
        const stateTypesToToggle: string[] = stateData.toggleTypes[manager.name] ?? [];
        const toDisable: string[] = [];
        const toEnable: string[] = [];
        manager.getTypes().forEach(type => {
            const interactive = manager.interactives.get(type);
            if (!interactive) return;
            // Type should be toggled (not default)
            if ((enableByDefault === interactive.isActive) && stateTypesToToggle.includes(type)) {
                interactive.isActive = !enableByDefault;
                if (enableByDefault) toDisable.push(type);
                else toEnable.push(type);
            }
            // Type should be default
            else if ((enableByDefault !== interactive.isActive) && !stateTypesToToggle.includes(type)) {
                interactive.isActive = enableByDefault;
                if (enableByDefault) toEnable.push(type);
                else toDisable.push(type);
            }
        });

        if (toDisable.length > 0) manager.dispatcher.onInteractivesDisabled(manager.name, toDisable);
        if (toEnable.length > 0) manager.dispatcher.onInteractivesEnabled(manager.name, toEnable);
    }

    // ============================== SAVE STATE ===============================

    /**
     * Saves the current graph in the state with the specified ID.
     * @param graph - The current graph.
     * @param id - The ID of the state to save.
     */
    saveState(graph: Graph, id: string): void {
        if (id === DEFAULT_STATE_ID) return;
        const stateData = this.graphsManager.plugin.settings.states.find(v => v.id == id);
        if (!stateData) return;
        const state = new GraphState(stateData?.name);
        state.setID(id);
        state.saveGraph(graph);
        this.onStateNeedsSaving(state.data);
    }

    onStateNeedsSaving(stateData: GraphStateData) {
        this.updateStateArray(stateData);
        this.graphsManager.plugin.saveSettings().then(() => {
            new Notice(`${STRINGS.plugin.name}: ${STRINGS.notices.stateSaved} (${stateData.name})`);
            this.updateAllStates();
        });
    }

    // ============================= UPDATE STATE ==============================

    private updateStateArray(stateData: GraphStateData): void {
        const index = this.graphsManager.plugin.settings.states.findIndex(v => v.name === stateData.name);
        if (index >= 0) {
            this.graphsManager.plugin.settings.states[index] = stateData;
        }
        else {
            this.graphsManager.plugin.settings.states.push(stateData);
        }
    }
    
    private updateAllStates(): void {
        this.graphsManager.dispatchers.forEach(dispatcher => {
            dispatcher.statesUI.updateStatesList(this.graphsManager.plugin.settings.states);
        });
    }

    // ============================= DELETE STATE ==============================
    
    /**
     * Deletes the state with the specified ID.
     * @param id - The ID of the state to delete.
     */
    deleteState(id: string): void {
        const state = this.getStateDataById(id);
        if (!state) return;
        this.graphsManager.plugin.settings.states.remove(state);
        this.graphsManager.plugin.saveSettings().then(() => {
            new Notice(`${STRINGS.plugin.name}: ${STRINGS.notices.stateDeleted} (${state.name})`);
            this.updateAllStates();
        });
    }
}