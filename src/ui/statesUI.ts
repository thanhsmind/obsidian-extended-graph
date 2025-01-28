import { Component, ExtraButtonComponent, Setting } from "obsidian";
import { DEFAULT_STATE_ID, Graph, GraphStateData, NewNameModal, UIElements, StatesManager } from "src/internal";
import ExtendedGraphPlugin from "src/main";
import STRINGS from "src/Strings";

export class StatesUI extends Component {
    statesManager: StatesManager;
    graph: Graph;
    plugin: ExtendedGraphPlugin;

    viewContent: HTMLElement;
    currentStateID: string;

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
        this.statesManager = this.graph.dispatcher.graphsManager.statesManager;
        this.plugin = this.statesManager.graphsManager.plugin;
        this.viewContent = this.graph.dispatcher.leaf.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
        this.root = this.viewContent.createDiv();
        this.root.addClass("graph-states-container");
        
        // TOGGLE BUTTON
        const graphControls = this.viewContent.querySelector(".graph-controls") as HTMLDivElement;
        this.toggleButton = new ExtraButtonComponent(graphControls)
            .setTooltip(STRINGS.states.openSettings)
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
                cb.extraSettingsEl.addClasses(["graph-controls-button", "mod-states"]);
            });

        // TITLE
        new Setting(this.root)
            .setName(STRINGS.states.states)
            .addDropdown(cb => {
                this.select = cb.selectEl;
                this.select.addEventListener('change', event => {
                    this.currentStateID = this.select.value;
                    this.displaySaveDeleteButton();
                    this.statesManager.changeState(this.graph, this.select.value);
                });
            })
            .addExtraButton(cb => {
                this.addButton = cb.extraSettingsEl;
                UIElements.setupExtraButton(cb, 'add');
                this.addButton.addEventListener('click', event => {
                    this.addButton.blur();
                    this.openModalToAddState();
                })
            })
            .addExtraButton(cb => {
                this.saveButton = cb.extraSettingsEl;
                UIElements.setupExtraButton(cb, 'save');
                this.saveButton.addEventListener('click', event => {
                    this.statesManager.saveState(this.graph, this.select.value);
                });
            })
            .addExtraButton(cb => {
                this.deleteButton = cb.extraSettingsEl;
                UIElements.setupExtraButton(cb, 'delete');
                this.deleteButton.addEventListener('click', event => {
                    this.statesManager.deleteState(this.select.value);
                });
            });

        // CURRENT STATE ID
        this.currentStateID = this.select.value;

        if (this.plugin.settings.collapseState) {
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

    private openModalToAddState() {
        const modal = new NewNameModal(
            this.plugin.app,
            STRINGS.states.newStateName,
            this.newState.bind(this)
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

    addState(key: string, name: string) {
        this.addOption(key, name);
        this.select.value = key;
    }

    newState(name: string): boolean {
        if (name.length === 0) return false;
        const id = this.statesManager.newState(this.graph, name);
        this.currentStateID = id;
        return true;
    }
    
    updateStatesList(states: GraphStateData[]): void {
        this.clear();
        states.forEach(state => {
            this.addOption(state.id, state.name);
        });
        if (states.find(v => v.id === this.currentStateID)) {
            this.select.value = this.currentStateID;
        }
        else {
            this.currentStateID = this.select.value;
        }
        this.displaySaveDeleteButton();
    }

    clear() {
        for(let i = this.select.length; i >= 0; i--) {
            this.select.remove(i);
        }
    }

    private displaySaveDeleteButton() {
        this.saveButton.style.display   = this.select.value !== DEFAULT_STATE_ID ? "" : "none";
        this.deleteButton.style.display = this.select.value !== DEFAULT_STATE_ID ? "" : "none";
    }

    open() {
        this.root.removeClass("is-closed");
        this.toggleButton.extraSettingsEl.addClass("is-active");
        this.isOpen = true;
        this.plugin.settings.collapseState = false;
        this.plugin.saveSettings();
    }

    close() {
        this.root.addClass("is-closed");
        this.toggleButton.extraSettingsEl.removeClass("is-active");
        this.isOpen = false;
        this.plugin.settings.collapseState = true;
        this.plugin.saveSettings();
    }
}