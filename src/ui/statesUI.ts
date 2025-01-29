import { Component, ExtraButtonComponent, Setting } from "obsidian";
import { DEFAULT_STATE_ID, Graph, GraphStateData, NewNameModal, UIElements, StatesManager, PluginInstances, GraphInstances } from "src/internal";
import ExtendedGraphPlugin from "src/main";
import STRINGS from "src/Strings";

export class StatesUI extends Component {
    instances: GraphInstances;

    viewContent: HTMLElement;
    currentStateID: string;

    isOpen: boolean;

    root: HTMLDivElement;
    toggleButton: ExtraButtonComponent;
    select: HTMLSelectElement;
    saveButton: HTMLElement;
    addButton: HTMLElement;
    deleteButton: HTMLElement;
    
    constructor(instances: GraphInstances) {
        super();
        this.instances = instances;
        this.viewContent = this.instances.leaf.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
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
                    PluginInstances.statesManager.changeState(this.instances, this.select.value);
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
                    PluginInstances.statesManager.saveState(this.instances, this.select.value);
                });
            })
            .addExtraButton(cb => {
                this.deleteButton = cb.extraSettingsEl;
                UIElements.setupExtraButton(cb, 'delete');
                this.deleteButton.addEventListener('click', event => {
                    PluginInstances.statesManager.deleteState(this.select.value);
                });
            });

        // CURRENT STATE ID
        this.currentStateID = this.select.value;

        if (PluginInstances.settings.collapseState) {
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
            PluginInstances.app,
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
        const id = PluginInstances.statesManager.newState(this.instances, name);
        this.currentStateID = id;
        return true;
    }
    
    updateStatesList(): void {
        this.clear();
        PluginInstances.settings.states.forEach(state => {
            this.addOption(state.id, state.name);
        });
        if (PluginInstances.settings.states.find(v => v.id === this.currentStateID)) {
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
        PluginInstances.settings.collapseState = false;
        PluginInstances.plugin.saveSettings();
    }

    close() {
        this.root.addClass("is-closed");
        this.toggleButton.extraSettingsEl.removeClass("is-active");
        this.isOpen = false;
        PluginInstances.settings.collapseState = true;
        PluginInstances.plugin.saveSettings();
    }
}