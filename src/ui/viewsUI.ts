import { Component, ExtraButtonComponent, Setting } from "obsidian";
import { DEFAULT_VIEW_ID, Graph, GraphViewData, NewNameModal, UIElements, ViewsManager } from "src/internal";
import ExtendedGraphPlugin from "src/main";

export class ViewsUI extends Component {
    viewsManager: ViewsManager;
    graph: Graph;
    plugin: ExtendedGraphPlugin;

    viewContent: HTMLElement;
    currentViewID: string;

    isOpen: boolean;

    root: HTMLDivElement;
    toggleButton: ExtraButtonComponent;
    select: HTMLSelectElement;
    saveButton: HTMLElement;
    addButton: HTMLElement;
    deleteButton: HTMLElement;
    
    constructor(graph: Graph) {
        super();
        this.graph = graph;
        this.viewsManager = this.graph.dispatcher.graphsManager.viewsManager;
        this.plugin = this.viewsManager.graphsManager.plugin;
        this.viewContent = this.graph.dispatcher.leaf.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
        this.root = this.viewContent.createDiv();
        this.root.addClass("graph-views-container");
        
        // TOGGLE BUTTON
        const graphControls = this.viewContent.querySelector(".graph-controls") as HTMLDivElement;
        this.toggleButton = new ExtraButtonComponent(graphControls)
            .setTooltip("Open views settings")
            .setIcon("eye")
            .onClick(() => {
                if (this.isOpen) {
                    this.close();
                }
                else {
                    this.open();
                }
            })
            .then(cb => {
                cb.extraSettingsEl.addClasses(["graph-controls-button", "mod-views"]);
            });

        // TITLE
        new Setting(this.root)
            .setName("Views")
            .addDropdown(cb => {
                this.select = cb.selectEl;
                this.select.addEventListener('change', event => {
                    this.currentViewID = this.select.value;
                    this.displaySaveDeleteButton();
                    this.viewsManager.changeView(this.graph, this.select.value);
                });
            })
            .addExtraButton(cb => {
                this.addButton = cb.extraSettingsEl;
                UIElements.setupExtraButton(cb, 'add');
                this.addButton.addEventListener('click', event => {
                    this.addButton.blur();
                    this.openModalToAddView();
                })
            })
            .addExtraButton(cb => {
                this.saveButton = cb.extraSettingsEl;
                UIElements.setupExtraButton(cb, 'save');
                this.saveButton.addEventListener('click', event => {
                    this.viewsManager.saveView(this.graph, this.select.value);
                });
            })
            .addExtraButton(cb => {
                this.deleteButton = cb.extraSettingsEl;
                UIElements.setupExtraButton(cb, 'delete');
                this.deleteButton.addEventListener('click', event => {
                    this.viewsManager.deleteView(this.select.value);
                });
            });

        // CURRENT VIEW ID
        this.currentViewID = this.select.value;

        if (this.plugin.settings.collapseView) {
            this.close();
        }
        else {
            this.open();
        }
    }

    onunload(): void {
        this.root.remove();
        this.toggleButton.extraSettingsEl.remove();
    }

    private openModalToAddView() {
        const modal = new NewNameModal(
            this.plugin.app,
            "New view name",
            this.newView.bind(this)
        );
        modal.open();
    }

    addOption(key: string, name: string): void {
        for (let i = 0; i < this.select.length; ++i) {
            if (this.select.options[i].value == key) {
                this.select.options[i].innerText = name;
                return;
            }
        }
        var option = document.createElement("option");
        option.value = key;
        option.text = name;
        this.select.appendChild(option);
    }

    addView(key: string, name: string) {
        this.addOption(key, name);
        this.select.value = key;
    }

    newView(name: string): boolean {
        if (name.length === 0) return false;
        const id = this.viewsManager.newView(this.graph, name);
        this.currentViewID = id;
        return true;
    }
    
    updateViewsList(views: GraphViewData[]): void {
        this.clear();
        views.forEach(view => {
            this.addOption(view.id, view.name);
        });
        if (views.find(v => v.id === this.currentViewID)) {
            this.select.value = this.currentViewID;
        }
        else {
            this.currentViewID = this.select.value;
        }
        this.displaySaveDeleteButton();
    }

    clear() {
        for(let i = this.select.length; i >= 0; i--) {
            this.select.remove(i);
        }
    }

    private displaySaveDeleteButton() {
        this.saveButton.style.display   = this.select.value !== DEFAULT_VIEW_ID ? "" : "none";
        this.deleteButton.style.display = this.select.value !== DEFAULT_VIEW_ID ? "" : "none";
    }

    open() {
        this.root.removeClass("is-closed");
        this.toggleButton.extraSettingsEl.addClass("is-active");
        this.isOpen = true;
        this.plugin.settings.collapseView = false;
        this.plugin.saveSettings();
    }

    close() {
        this.root.addClass("is-closed");
        this.toggleButton.extraSettingsEl.removeClass("is-active");
        this.isOpen = false;
        this.plugin.settings.collapseView = true;
        this.plugin.saveSettings();
    }
}