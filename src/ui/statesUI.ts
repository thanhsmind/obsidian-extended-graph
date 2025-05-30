import { stat } from "fs";
import { Component, DropdownComponent, ExtraButtonComponent, Setting } from "obsidian";
import { DEFAULT_STATE_ID, NewNameModal, UIElements, PluginInstances, GraphInstances } from "src/internal";
import STRINGS from "src/Strings";

export class StatesUI extends Component {
    instances: GraphInstances;

    currentStateID: string;

    isOpen: boolean;

    root: HTMLDivElement;
    statePane: Setting;
    toggleButton: ExtraButtonComponent;
    select: DropdownComponent;
    saveButton: ExtraButtonComponent;
    addButton: ExtraButtonComponent;
    deleteButton: ExtraButtonComponent;
    editButton: ExtraButtonComponent;

    constructor(instances: GraphInstances) {
        super();
        this.instances = instances;
        this.root = this.instances.view.contentEl.createDiv();
        this.root.addClass("graph-states-container");

        // TOGGLE BUTTON
        const graphControls = this.instances.view.contentEl.querySelector(".graph-controls") as HTMLDivElement;
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

        // STATE PANE
        this.statePane = new Setting(this.root)
            .setName(STRINGS.states.states)
            .addDropdown(cb => {
                this.select = cb;
                cb.onChange(value => {
                    this.currentStateID = value;
                    this.displaySaveDeleteButton();
                    PluginInstances.statesManager.changeState(this.instances, value);
                })
            })
            .addExtraButton(cb => {
                this.editButton = cb;
                UIElements.setupExtraButton(cb, 'edit');
                cb.onClick(() => {
                    this.editButton.extraSettingsEl.blur();
                    this.openModalToRenameState();
                });
            })
            .addExtraButton(cb => {
                this.addButton = cb;
                UIElements.setupExtraButton(cb, 'add');
                cb.onClick(() => {
                    this.addButton.extraSettingsEl.blur();
                    this.openModalToAddState();
                })
            })
            .addExtraButton(cb => {
                this.saveButton = cb;
                UIElements.setupExtraButton(cb, 'save');
                cb.onClick(() => {
                    PluginInstances.statesManager.saveState(this.instances, this.select.getValue());
                });
            })
            .addExtraButton(cb => {
                this.deleteButton = cb;
                UIElements.setupExtraButton(cb, 'delete');
                cb.onClick(() => {
                    PluginInstances.statesManager.deleteState(this.select.getValue());
                });
            });

        // CURRENT STATE ID
        this.currentStateID = this.select.getValue();

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
            STRINGS.states.newStateName,
            this.newState.bind(this)
        );
        modal.open();
    }

    private openModalToRenameState() {
        const stateData = PluginInstances.statesManager.getStateDataById(this.currentStateID);
        if (stateData) {
            const modal = new NewNameModal(
                STRINGS.states.editStateName,
                this.renameState.bind(this),
                stateData.name
            );
            modal.open();
        }
    }

    private addOption(key: string, name: string): void {
        for (let i = 0; i < this.select.selectEl.length; ++i) {
            if (this.select.selectEl.options[i].value == key) {
                this.select.selectEl.options[i].innerText = name;
                return;
            }
        }
        this.select.addOption(key, name);
    }

    private addState(key: string, name: string) {
        this.addOption(key, name);
        this.select.setValue(key);
    }

    private newState(name: string): boolean {
        if (name.length === 0) return false;
        const id = PluginInstances.statesManager.newState(this.instances, name);
        this.currentStateID = id;
        return true;
    }

    private renameState(name: string): boolean {
        if (name.length === 0) return false;
        PluginInstances.statesManager.renameState(this.currentStateID, name);
        return true;
    }

    updateStatesList(): void {
        this.clear();
        PluginInstances.settings.states.forEach(state => {
            this.addOption(state.id, state.name);
        });
        if (PluginInstances.settings.states.find(v => v.id === this.currentStateID)) {
            this.setValue(this.currentStateID);
        }
        else {
            this.currentStateID = this.select.getValue();
        }
    }

    private setValue(id: string) {
        this.currentStateID = id;
        this.select.setValue(id);
        this.displaySaveDeleteButton();
    }

    private clear() {
        for (let i = this.select.selectEl.length; i >= 0; i--) {
            this.select.selectEl.remove(i);
        }
    }

    private displaySaveDeleteButton() {
        if (this.select.getValue() !== DEFAULT_STATE_ID) {
            this.statePane.settingEl.append(this.editButton.extraSettingsEl);
            this.statePane.settingEl.append(this.saveButton.extraSettingsEl);
            this.statePane.settingEl.append(this.deleteButton.extraSettingsEl);
        }
        else {
            this.editButton.extraSettingsEl.remove();
            this.saveButton.extraSettingsEl.remove();
            this.deleteButton.extraSettingsEl.remove();
        }
    }

    private open() {
        this.root.removeClass("is-closed");
        this.toggleButton.extraSettingsEl.addClass("is-active");
        this.isOpen = true;
        PluginInstances.settings.collapseState = false;
        PluginInstances.plugin.saveSettings();
    }

    private close() {
        this.root.addClass("is-closed");
        this.toggleButton.extraSettingsEl.removeClass("is-active");
        this.isOpen = false;
        PluginInstances.settings.collapseState = true;
        PluginInstances.plugin.saveSettings();
    }
}