import { EngineOptions, FOLDER_KEY, Graph, GraphViewData, LINK_KEY, TAG_KEY } from "src/internal";

export class GraphView {
    data = new GraphViewData();

    constructor(name: string) {
        this.data.name = name;
    }

    setID(id?: string) {
        this.data.id = id ? id : crypto.randomUUID();
    }

    saveGraph(graph: Graph) {
        // Disable types
        this.data.toggleTypes = {};
        
        const linksManager = graph.linksSet.managers.get(LINK_KEY);
        this.data.toggleTypes[LINK_KEY] = linksManager?.getTypes()
            .filter(type => graph.dynamicSettings.interactiveSettings[LINK_KEY].enableByDefault !== linksManager.isActive(type)) ?? [];

        const folderManager = graph.folderBlobs.managers.get(FOLDER_KEY);
        this.data.toggleTypes[FOLDER_KEY] = folderManager?.getTypes()
            .filter(type => graph.dynamicSettings.interactiveSettings[FOLDER_KEY].enableByDefault !== folderManager.isActive(type)) ?? [];

        for (const [key, manager] of graph.nodesSet.managers) {
            this.data.toggleTypes[key] = manager.getTypes()
                .filter(type => graph.dynamicSettings.interactiveSettings[key].enableByDefault !== manager.isActive(type));
        }

        // Pinned nodes
        this.data.pinNodes = {};
        for (const [id, extendedNode] of graph.nodesSet.extendedElementsMap) {
            if (extendedNode.isPinned) {
                this.data.pinNodes[id] = {x: extendedNode.coreElement.x, y: extendedNode.coreElement.y};
            }
        }

        // Engine options
        this.data.engineOptions = new EngineOptions(graph.engine.getOptions());
        this.data.engineOptions.search = graph.engine.filterOptions.search.inputEl.value;
    }

    saveView(viewData: GraphViewData): boolean {
        this.data = viewData;
        return this.completeDefaultOptions();
    }

    isValidProperty(key: string) {
        return ['id', 'name', 'toggleTypes', 'pinNodes', 'engineOptions'].includes(key);
    }

    completeDefaultOptions(): boolean {
        let hasChanged = false;
        if (!this.data.toggleTypes) {
            this.data.toggleTypes = {};
            hasChanged = true;
        }
        if (!this.data.toggleTypes[TAG_KEY]) {
            this.data.toggleTypes[TAG_KEY] = [];
            hasChanged = true;
        }
        if (!this.data.toggleTypes[LINK_KEY]) {
            this.data.toggleTypes[LINK_KEY] = [];
            hasChanged = true;
        }
        if (!this.data.toggleTypes[FOLDER_KEY]) {
            this.data.toggleTypes[FOLDER_KEY] = [];
            hasChanged = true;
        }
        if (!this.data.pinNodes) {
            this.data.pinNodes = {};
            hasChanged = true;
        }
        if (!this.data.engineOptions) {
            this.data.engineOptions = new EngineOptions();
            hasChanged = true;
        }

        for (const key in this.data) {
            if (!this.isValidProperty(key)) {
                delete (this.data as any)[key];
                hasChanged = true;
            }
        }

        return hasChanged;
    }
}