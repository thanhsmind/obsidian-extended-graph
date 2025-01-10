import { EventRef, WorkspaceLeaf } from "obsidian";
import { GraphViewExt, LocalGraphViewExt } from "./view";

export type WorkspaceLeafExt = WorkspaceLeaf & {
    on(name: "extended-graph:disable-plugin",   callback: (leaf: WorkspaceLeafExt) => void): EventRef;
    on(name: "extended-graph:enable-plugin",    callback: (leaf: WorkspaceLeafExt) => void): EventRef;
    on(name: "extended-graph:reset-plugin",     callback: (leaf: WorkspaceLeafExt) => void): EventRef;

    view: GraphViewExt | LocalGraphViewExt;
}