import { App, ExtraButtonComponent, Modal, TFile } from "obsidian";
import { getFile, Graph, GraphView } from "src/internal";

export class GraphViewModal extends Modal {
    view: GraphView;
    graph: Graph;
    sortableTables: Record<string, {
        asc: (boolean | undefined)[],
        index: number,
        table: HTMLTableElement
    }> = {};

    constructor(app: App, graph: Graph) {
        super(app);
        this.graph = graph;
        this.view = new GraphView("");
        this.view.saveGraph(graph);
        this.setTitle("Graph state");
        this.modalEl.addClass("graph-modal-graph-state");
    }

    onOpen() {
        this.addNodes();
        this.addLinks();
        this.addPinnedNodes();
    }

    private addNodes() {
        this.createHeading("Nodes");

        const table = this.contentEl.createEl("table");

        const thead = table.createTHead();
        const tr_thead = thead.insertRow();

        let cell: HTMLTableCellElement;
        cell = tr_thead.insertCell(); cell.setText("Folder");
        cell = tr_thead.insertCell(); cell.setText("Filename");
        cell = tr_thead.insertCell(); cell.setText("Enabled");
        for (const [key, manager] of this.graph.nodesSet.managers) {
            cell = tr_thead.insertCell(); cell.setText(key);
        }

        const tbody = table.createTBody();

        for (const [id, extendedNode] of this.graph.nodesSet.extendedElementsMap) {
            const nodeData = this.getNodeData(id);

            const tr = tbody.insertRow();
            let cell: HTMLTableCellElement;
            cell = tr.insertCell(); cell.setText(nodeData.path);
            cell = tr.insertCell(); nodeData.link ? cell.appendChild(nodeData.link) : cell.setText(id);
            cell = tr.insertCell(); if (!extendedNode.isAnyManagerDisabled()) cell.setText("✓");

            for (const [key, manager] of this.graph.nodesSet.managers) {
                cell = tr.insertCell();
                cell.addClass("column-interactives");
                const types = extendedNode.types.get(key);
                if (types) {
                    for (const type of types) {
                        const color = manager.getColor(type);
                        const span = cell.createEl("span");
                        span.addClass("tag");
                        if (!manager.isActive(type)) span.addClass("is-disabled");
                        span.style.setProperty("--interactive-color", `${color[0]}, ${color[1]}, ${color[2]}`);
                        span.setText(type);
                    }
                }
            }
        }

        this.makeSortable("nodes", table);
    }

    private addLinks() {
        this.createHeading("Nodes");

        const table = this.contentEl.createEl("table");

        const thead = table.createTHead();
        const tr_thead = thead.insertRow();
        let cell: HTMLTableCellElement;

        cell = tr_thead.insertCell(); cell.setText("Folder (source)");
        cell = tr_thead.insertCell(); cell.setText("Filename (source)");
        cell = tr_thead.insertCell(); cell.setText("Folder (target)");
        cell = tr_thead.insertCell(); cell.setText("Filename (target)");
        cell = tr_thead.insertCell(); cell.setText("Enabled");
        for (const [key, manager] of this.graph.linksSet.managers) {
            cell = tr_thead.insertCell(); cell.setText(key);;
        }

        const tbody = table.createTBody();

        for (const [id, extendedLink] of this.graph.linksSet.extendedElementsMap) {
            const nodeSourceData = this.getNodeData(extendedLink.coreElement.source.id);
            const nodeTargetData = this.getNodeData(extendedLink.coreElement.target.id);

            const tr = tbody.insertRow();
            let cell: HTMLTableCellElement;
            cell = tr.insertCell(); cell.setText(nodeSourceData.path);
            cell = tr.insertCell(); nodeSourceData.link ? cell.appendChild(nodeSourceData.link) : cell.setText(extendedLink.coreElement.source.id);
            cell = tr.insertCell(); cell.setText(nodeTargetData.path);
            cell = tr.insertCell(); nodeTargetData.link ? cell.appendChild(nodeTargetData.link) : cell.setText(extendedLink.coreElement.target.id);
            cell = tr.insertCell(); if (!extendedLink.isAnyManagerDisabled()) cell.setText("✓");

            for (const [key, manager] of this.graph.linksSet.managers) {
                cell = tr.insertCell();
                cell.addClass("column-interactives");
                const types = extendedLink.types.get(key);
                if (types) {
                    for (const type of types) {
                        const color = manager.getColor(type);
                        const span = cell.createEl("span");
                        span.addClass("tag");
                        if (!manager.isActive(type)) span.addClass("is-disabled");
                        span.style.setProperty("--interactive-color", `${color[0]}, ${color[1]}, ${color[2]}`);
                        span.setText(type);
                    }
                }
            }
        }

        this.makeSortable("links", table);
    }

    private addPinnedNodes() {
        this.createHeading("Pinned nodes");

        const table = this.contentEl.createEl("table");

        const thead = table.createTHead();
        const tr_thead = thead.insertRow();
        for (const str of ["Path", "Filename", "X", "Y"]) {
            const cell = tr_thead.insertCell();
            cell.setText(str)
        }

        const tbody = table.createTBody();

        if (this.view.data.pinNodes) {
            for (const [id, p] of Object.entries(this.view.data.pinNodes)) {
                const nodeData = this.getNodeData(id);

                const tr = tbody.insertRow();
                let cell: HTMLTableCellElement;
                cell = tr.insertCell(); cell.setText(nodeData.path);
                cell = tr.insertCell(); nodeData.link ? cell.appendChild(nodeData.link) : cell.setText(id);
                cell = tr.insertCell(); cell.setText(p.x.toFixed(2));
                cell = tr.insertCell(); cell.setText(p.y.toFixed(2));
            }
        }
        

        this.makeSortable("pinned", table);
    }

    private createHeading(title: string): HTMLHeadingElement {
        const h1 = this.contentEl.createEl("h1");
        h1.setText(title);
        return h1;
    }

    private getNodeData(id: string): { file?: TFile, path: string, link?: HTMLAnchorElement } {
        const file = getFile(this.app, id);
        const path = this.getPath(file);
        const link = this.getLink(file);
        return {
            file: file ?? undefined,
            path: path,
            link: link
        }
    }

    private getPath(file: TFile | null): string {
        let path = "";
        if (file) path = file.parent?.path ?? "";
        return path;
    }

    private getLink(file: TFile | null): HTMLAnchorElement | undefined {
        let link: HTMLAnchorElement | undefined;
        if (file) {
            link = createEl("a");
            link.setText(file.basename);
            link.onclick = (ev) => {
                this.close();
                this.app.workspace.getLeaf(true).openFile(file);
            }
        }
        return link;
    }

    private makeSortable(key: string, table: HTMLTableElement, index: number = 1) {
        if (!table.tHead) return;

        this.sortableTables[key] = {
            table: table,
            index: index,
            asc: Array.from(table.tHead.rows[0].cells).map(el => undefined),
        };

        let i = 0;
        Array.from(table.tHead.rows[0].cells)
            .forEach(td => {
                new ExtraButtonComponent(td)
                    .setIcon("chevron-down")
                    .onClick(() => {
                        if (!table.tHead) return;
                        this.sortableTables[key].index = Array.from(table.tHead.rows[0].cells).indexOf(td);
                        this.sortTable(key);
                    });

                i++;
            });

        this.sortTable(key);
    }

    private sortTable(key: string) {
        const asc = !this.sortableTables[key].asc[this.sortableTables[key].index];
        this.sortableTables[key].asc[this.sortableTables[key].index] = asc;
        Array.from(this.sortableTables[key].table.tBodies[0].rows)
            .sort((a: HTMLTableRowElement, b: HTMLTableRowElement) => {
                const aText = a.cells[this.sortableTables[key].index].textContent ?? "";
                const bText = b.cells[this.sortableTables[key].index].textContent ?? "";
                if (asc) {
                    return aText.localeCompare(bText);
                }
                else {
                    return bText.localeCompare(aText);
                }
            })
            .forEach(tr => {
                this.sortableTables[key].table.tBodies[0].appendChild(tr)
            });
        for (let i = 0, n = this.sortableTables[key].asc.length; i < n; ++i) {
            if (i === this.sortableTables[key].index) {
                this.sortableTables[key].asc[i] = asc;
                this.sortableTables[key].table.tHead?.rows[0].cells[i].addClass(asc ? "sorted-asc" : "sorted-desc");
                this.sortableTables[key].table.tHead?.rows[0].cells[i].removeClass(!asc ? "sorted-asc" : "sorted-desc");
            }
            else {
                this.sortableTables[key].asc[i] = undefined;
                this.sortableTables[key].table.tHead?.rows[0].cells[i].removeClasses(["sorted-asc", "sorted-desc"]);
            }
        }
    }
    
	onClose(): void {
		this.contentEl.empty();
	}
}