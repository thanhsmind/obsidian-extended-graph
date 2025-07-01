import { GraphView, LocalGraphView } from "obsidian-typings";
import {
    DEFAULT_STATE_ID,
    EngineOptions,
    FOLDER_KEY,
    getEngine,
    GraphInstances,
    GraphState,
    GraphStateData,
    InteractiveManager,
    InteractiveUI,
    PluginInstances,
    t
} from "src/internal";



export class StatesManager {

    // ================================ GETTERS ================================

    getStateDataById(id: string): GraphStateData | undefined {
        return PluginInstances.settings.states.find(v => v.id === id);
    }

    // ============================= CREATE STATE ==============================

    /**
     * Creates a new state with the specified name from the current graph.
     * @param graph - The current graph.
     * @param name - The name of the new state.
     * @returns string - The ID of the new state.
     */
    newState(instance: GraphInstances, name: string): string {
        const state = new GraphState(name);
        state.setID();
        state.saveGraph(instance);
        this.onStateNeedsSaving(state.data);
        return state.data.id;
    }

    // ============================= CHANGE STATE ==============================

    changeState(instances: GraphInstances, id: string) {
        let stateData = this.getStateDataById(id);
        if (!stateData) return;

        stateData = this.validateStateData(stateData);
        if (!stateData) return;

        instances.stateData = stateData;

        if (instances.dispatcher.lastFilteringAction)
            instances.dispatcher.lastFilteringAction.record = false;

        setTimeout(() => {
            this.updateInteractiveManagers(stateData, instances);
            if (stateData.engineOptions) {
                instances.colorGroupHaveChanged = stateData.engineOptions.colorGroups !== instances.engine.options.colorGroups;
                instances.engine.setOptions(stateData.engineOptions);
                for (const node of instances.renderer.nodes) {
                    // @ts-ignore
                    node.fontDirty = true;
                }
            }

            instances.legendUI?.updateUIFromState();

            instances.statePinnedNodes = structuredClone(stateData.pinNodes) ?? {};

            if (instances.statesUI.currentStateID === id && instances.dispatcher.lastFilteringAction) {
                instances.dispatcher.lastFilteringAction.record = true;
            }
        }, 200)
    }

    private validateStateData(stateData: GraphStateData): GraphStateData {
        const state = new GraphState(stateData.name);
        const hasChanged = state.saveState(stateData);
        if (hasChanged) {
            this.onStateNeedsSaving(state.data);
        }
        return state.data;
    }

    private updateInteractiveManagers(stateData: GraphStateData, instance: GraphInstances): void {
        this.updateManagers(stateData, instance.nodesSet.managers, instance.legendUI);
        this.updateManagers(stateData, instance.linksSet.managers, instance.legendUI);
        if (instance.foldersSet) this.updateManagers(stateData, instance.foldersSet.managers, instance.foldersUI);
    }

    private updateManagers(stateData: GraphStateData, managers: Map<string, InteractiveManager>, interactiveUI: InteractiveUI | null): void {
        for (const [key, manager] of managers) {
            if (!PluginInstances.settings.interactiveSettings[key].hasOwnProperty('enableByDefault')) {
                PluginInstances.settings.interactiveSettings[key].enableByDefault = key !== FOLDER_KEY;
                PluginInstances.plugin.saveSettings();
            }
            const enableByDefault = PluginInstances.settings.interactiveSettings[key].enableByDefault;
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
        const enableByDefault = PluginInstances.settings.interactiveSettings[manager.name].enableByDefault;
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

        if (toDisable.length > 0) manager.instances.dispatcher.onInteractivesDisabled(manager.name, toDisable);
        if (toEnable.length > 0) manager.instances.dispatcher.onInteractivesEnabled(manager.name, toEnable);
    }

    // ============================== SAVE STATE ===============================

    /**
     * Saves the current graph in the state with the specified ID.
     * @param graph - The current graph.
     * @param id - The ID of the state to save.
     */
    async saveState(instance: GraphInstances, id: string): Promise<void> {
        if (id === DEFAULT_STATE_ID) return;
        const stateData = PluginInstances.settings.states.find(v => v.id == id);
        if (!stateData) return;
        const state = new GraphState(stateData.name);
        state.saveState(stateData);
        state.setID(id);
        state.saveGraph(instance);
        await this.onStateNeedsSaving(state.data);
    }

    async onStateNeedsSaving(stateData: GraphStateData, notice: boolean = false): Promise<void> {
        this.updateStateArray(stateData);
        await PluginInstances.plugin.saveSettings().then(() => {
            if (notice) new Notice(`${t("plugin.name")}: ${t("notices.stateSaved")} (${stateData.name})`);
            this.updateAllStates();
        });
    }

    async saveForDefaultState(view: GraphView | LocalGraphView): Promise<void> {
        const stateData = this.getStateDataById(DEFAULT_STATE_ID);
        if (!stateData) return;
        const engine = getEngine(view);
        if (!engine) return;
        stateData.engineOptions = new EngineOptions(engine.getOptions());
        await this.onStateNeedsSaving(stateData);
    }

    // ============================= UPDATE STATE ==============================

    private updateStateArray(stateData: GraphStateData): void {
        const index = PluginInstances.settings.states.findIndex(v => v.name === stateData.name);
        if (index >= 0) {
            PluginInstances.settings.states[index] = stateData;
        }
        else {
            PluginInstances.settings.states.push(stateData);
        }
    }

    private updateAllStates(): void {
        PluginInstances.graphsManager.allInstances.forEach(instances => {
            instances.statesUI.updateStatesList();
        });
    }

    renameState(id: string, newName: string): void {
        const stateData = this.getStateDataById(id);
        if (!stateData || stateData.name === newName) return;
        stateData.name = newName;
        PluginInstances.plugin.saveSettings().then(() => {
            new Notice(`${t("plugin.name")}: ${t("notices.stateRenamed")} (${newName})`);
            this.updateAllStates();
        });
    }

    // ============================= DELETE STATE ==============================

    /**
     * Deletes the state with the specified ID.
     * @param id - The ID of the state to delete.
     */
    deleteState(id: string): void {
        if (id === DEFAULT_STATE_ID) return;
        const state = this.getStateDataById(id);
        if (!state) return;
        PluginInstances.settings.states.remove(state);
        PluginInstances.plugin.saveSettings().then(() => {
            new Notice(`${t("plugin.name")}: ${t("notices.stateDeleted")} (${state.name})`);
            this.updateAllStates();
        });
    }
}