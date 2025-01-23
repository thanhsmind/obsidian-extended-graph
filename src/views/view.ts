import { Graph } from "src/graph/graph";
import { EngineOptions, GraphViewData } from "./viewData";
import { FOLDER_KEY, LINK_KEY } from "src/globalVariables";

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
        this.data.disabledTypes = {};
        
        const linksManager = graph.linksSet.managers.get(LINK_KEY);
        this.data.disabledTypes[LINK_KEY] = linksManager?.getTypes().filter(type => !linksManager.isActive(type)) ?? [];

        const folderManager = graph.folderBlobs.managers.get(FOLDER_KEY);
        this.data.disabledTypes[FOLDER_KEY] = folderManager?.getTypes().filter(type => !folderManager.isActive(type)) ?? [];

        for (const [key, manager] of graph.nodesSet.managers) {
            this.data.disabledTypes[key] = manager.getTypes().filter(type => !manager.isActive(type));
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
}