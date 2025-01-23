import { ButtonComponent, ExtraButtonComponent } from "obsidian";

const BUTTON_DELETE_CLASS: string = "extended-graph-delete-button";
const BUTTON_ADD_CLASS: string    = "extended-graph-add-button";

export type ButtonType = 'add' | 'delete' | 'save';

export class UIElements {
    static setupButton(button: ButtonComponent, type: ButtonType) {
        switch (type) {
            case 'add':
                button.setClass(BUTTON_ADD_CLASS);
                button.setIcon('plus');
                button.setTooltip('Add');
                break;
            case 'delete':
                button.setClass(BUTTON_DELETE_CLASS);
                button.setIcon('trash-2');
                button.setTooltip('Remove');
                break;
            case 'save':
                button.setIcon('save');
                button.setTooltip('Save');
                break;
        
            default:
                break;
        }
    }

    static setupExtraButton(extraButton: ExtraButtonComponent, type: ButtonType) {
        switch (type) {
            case 'add':
                extraButton.extraSettingsEl.addClass(BUTTON_ADD_CLASS);
                extraButton.setIcon('plus');
                extraButton.setTooltip('Add');
                break;
            case 'delete':
                extraButton.extraSettingsEl.addClass(BUTTON_DELETE_CLASS);
                extraButton.setIcon('trash-2');
                extraButton.setTooltip('Remove');
                break;
            case 'save':
                extraButton.setIcon('save');
                extraButton.setTooltip('Save');
                break;
        
            default:
                break;
        }
    }
}