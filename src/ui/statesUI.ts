import { Component, DropdownComponent, ExtraButtonComponent, Setting } from "obsidian";
import path from "path";
import { DEFAULT_STATE_ID, NewNameModal, UIElements, PluginInstances, GraphInstances, t } from "src/internal";

export class StatesUI extends Component {
    instances: GraphInstances;

    currentStateID: string;

    isOpen: boolean;

    root: HTMLDivElement;
    stateSetting: Setting;
    settingsSetting: Setting;
    toggleButton: ExtraButtonComponent;
    selectState: DropdownComponent;
    selectConfig: DropdownComponent;
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
            .setTooltip(t("states.openSettings"))
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

        this.addStateSetting();
        this.addSettingsSetting();

        // CURRENT STATE ID
        this.currentStateID = this.selectState.getValue();
        this.instances.stateData = PluginInstances.statesManager.getStateDataById(this.currentStateID);

        if (PluginInstances.settings.collapseState) {
            this.close();
        }
        else {
            this.open();
        }
    }

    private addStateSetting() {
        this.stateSetting = new Setting(this.root)
            .setName(t("states.states"))
            .addDropdown(cb => {
                this.selectState = cb;
                cb.onChange(value => {
                    this.currentStateID = value;
                    this.instances.stateData = PluginInstances.statesManager.getStateDataById(this.currentStateID);
                    this.displaySaveDeleteButton();
                    this.instances.dispatcher.changeState(value);
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
                    PluginInstances.statesManager.saveState(this.instances, this.selectState.getValue());
                });
            })
            .addExtraButton(cb => {
                this.deleteButton = cb;
                UIElements.setupExtraButton(cb, 'delete');
                cb.onClick(() => {
                    PluginInstances.statesManager.deleteState(this.selectState.getValue());
                });
            });
    }

    private addSettingsSetting() {
        this.settingsSetting = new Setting(this.root)
            .setName(t("plugin.settings"))
            .addDropdown(async (cb) => {
                this.selectConfig = cb;
                await this.updateConfigList();

                cb.onChange(filepath => {
                    if (filepath === "") {
                        return;
                    }
                    PluginInstances.plugin.importSettings(filepath).then(() => {
                        PluginInstances.graphsManager.resetPlugin(this.instances.view);
                    });
                })
            });
    }

    async updateConfigList() {
        const dir = PluginInstances.configurationDirectory;
        const files = (await PluginInstances.app.vault.adapter.exists(dir)) ?
            (await PluginInstances.app.vault.adapter.list(dir)).files
            : [];

        for (let i = this.selectConfig.selectEl.length; i >= 0; i--) {
            this.selectConfig.selectEl.remove(i);
        }
        this.selectConfig.addOption("", "");
        this.selectConfig.addOptions(Object.fromEntries(files.map(file => [file, path.basename(file, ".json")])));
    }

    onunload(): void {
        this.root.remove();
        this.toggleButton.extraSettingsEl.remove();
    }

    private openModalToAddState() {
        const modal = new NewNameModal(
            t("states.newStateName"),
            this.newState.bind(this)
        );
        modal.open();
    }

    private openModalToRenameState() {
        const stateData = this.instances.stateData;
        if (stateData) {
            const modal = new NewNameModal(
                t("states.editStateName"),
                this.renameState.bind(this),
                stateData.name
            );
            modal.open();
        }
    }

    private addOption(key: string, name: string): void {
        for (let i = 0; i < this.selectState.selectEl.length; ++i) {
            if (this.selectState.selectEl.options[i].value == key) {
                this.selectState.selectEl.options[i].innerText = name;
                return;
            }
        }
        this.selectState.addOption(key, name);
    }

    private addState(key: string, name: string) {
        this.addOption(key, name);
        this.selectState.setValue(key);
    }

    private newState(name: string): boolean {
        if (name.length === 0) return false;
        const id = PluginInstances.statesManager.newState(this.instances, name);
        this.currentStateID = id;
        this.instances.stateData = PluginInstances.statesManager.getStateDataById(this.currentStateID);
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
            this.currentStateID = this.selectState.getValue();
            this.instances.stateData = PluginInstances.statesManager.getStateDataById(this.currentStateID);
            this.displaySaveDeleteButton();
        }
    }

    setValue(id: string) {
        this.currentStateID = id;
        this.instances.stateData = PluginInstances.statesManager.getStateDataById(this.currentStateID);
        this.selectState.setValue(id);
        this.displaySaveDeleteButton();
    }

    private clear() {
        for (let i = this.selectState.selectEl.length; i >= 0; i--) {
            this.selectState.selectEl.remove(i);
        }
    }

    private displaySaveDeleteButton() {
        if (this.selectState.getValue() !== DEFAULT_STATE_ID) {
            this.stateSetting.settingEl.append(this.editButton.extraSettingsEl);
            this.stateSetting.settingEl.append(this.saveButton.extraSettingsEl);
            this.stateSetting.settingEl.append(this.deleteButton.extraSettingsEl);
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