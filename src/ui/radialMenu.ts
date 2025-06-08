import { Menu, MenuPositionDef, setTooltip } from "obsidian";
import { ExtendedGraphLink, ExtendedGraphNode, FOLDER_KEY, FolderBlob, GraphInstances, GraphStateModal, LINK_KEY, TAG_KEY, textColor } from "src/internal";
import STRINGS from "src/Strings";

interface RadialMenuItem {
    id: string;
    title: string;
    icon: string;
    color: string;
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    items?: RadialMenuItem[];
}

export class RadialMenu extends Menu {
    level: number
    radialSubmenus: Map<string, RadialMenu> = new Map();
    position?: { x: number, y: number };
    menuManager: RadialMenuManager;

    constructor(menuManager: RadialMenuManager, allItems: RadialMenuItem[], level: number, parentMenu?: RadialMenu) {
        super();

        this.menuManager = menuManager;
        this.level = level;
        this.parentMenu = parentMenu ?? null;

        this.dom.addClass("extended-graph-radial-menu");
        if (level > 0) {
            this.dom.addClass("mod-submenu");
            this.dom.style.setProperty("--submenu-level", level.toString());
        }

        this.setItems(allItems);
        this.setCentralItem();
    }

    override showAtMouseEvent(evt: MouseEvent): this {
        this.position = { x: evt.clientX, y: evt.clientY };
        return super.showAtMouseEvent(evt);
    }

    override showAtPosition(position: MenuPositionDef, doc?: Document): this {
        this.position = position;
        return super.showAtPosition(position, doc);
    }

    private onClick(item: RadialMenuItem) {
        if (item.items && item.items.length > 0) {
            this.showNestedMenu(item);
        } else if (item.onClick) {
            item.onClick();
        }
    }

    private onMouseEnter(item: RadialMenuItem) {
        if (item.onMouseEnter) {
            item.onMouseEnter();
        }
    }

    private onMouseLeave(item: RadialMenuItem) {
        if (item.onMouseLeave) {
            item.onMouseLeave();
        }
    }

    private onClickCenter() {
        if (this.parentMenu) {
            this.switchWhichMenu(this.parentMenu as RadialMenu);
        }
    }

    private setItems(items: RadialMenuItem[]) {
        const onClick = this.onClick.bind(this);
        const onMouseEnter = this.onMouseEnter.bind(this);
        const onMouseLeave = this.onMouseLeave.bind(this);

        for (let i = 0; i < items.length; ++i) {
            this.addItem((item) => {
                item.dom.style.setProperty("--color-rgb", `var(--color-${items[i].color}-rgb)`);
                item.dom.style.setProperty("--rotation", `${-22.5 + (i - 1) * 45}deg`);
                item.setTitle(items[i].title)
                    .setIcon(items[i].icon)
                    .onClick(() => {
                        onClick(items[i]);
                    });
                setTooltip(item.dom, items[i].title, { placement: 'bottom' });

                item.dom.addEventListener('mouseenter', () => onMouseEnter(items[i]));
                item.dom.addEventListener('mouseleave', () => onMouseLeave(items[i]));

                const subitems = items[i].items;
                if (subitems && subitems.length > 0) {
                    this.radialSubmenus.set(items[i].id, new RadialMenu(this.menuManager, subitems, this.level + 1, this));
                }
            })
        }
    }

    private setCentralItem() {
        const onClickCenter = this.onClickCenter.bind(this);
        this.addItem((item) => {
            item.dom.addClass("back");
            if (this.level > 0) {
                item.setIcon("undo-2");
            }
            else {
                item.setIcon("x");
            }
            item.onClick(onClickCenter);
        });
    }

    private showNestedMenu(item: RadialMenuItem) {
        const submenu = this.radialSubmenus.get(item.id);
        if (!submenu) return;

        this.switchWhichMenu(submenu);
    }

    private switchWhichMenu(menu: RadialMenu) {
        if (!this.position) {
            this.position = this.dom.getBoundingClientRect();
        }

        this.close();
        this.menuManager.setCurrentMenu(menu);
        menu.showAtPosition({ x: this.position.x, y: this.position.y, left: true });
    }
}

export class RadialMenuManager {
    instances: GraphInstances;
    nodeID: string;
    nodeType: string;

    menu: RadialMenu;
    allItems: RadialMenuItem[];

    constructor(instances: GraphInstances, node: string, type: string) {
        this.instances = instances;
        this.nodeID = node;
        this.nodeType = type;

        this.populateItems();
        this.menu = new RadialMenu(this, this.allItems, 0);
    }

    open(e: MouseEvent | null) {
        const node = this.instances.renderer.nodes.find(node => node.id === this.nodeID);
        if (node?.circle) {
            const canvasBound = this.instances.renderer.interactiveEl.getBoundingClientRect();
            const nodePos = node.circle.getGlobalPosition();
            this.menu.showAtPosition({ x: nodePos.x + canvasBound.left, y: nodePos.y + canvasBound.top, left: true });
            return;
        }
        else if (e) {
            this.menu.showAtPosition({ x: e.clientX, y: e.clientY, left: true });
        }
    }

    private populateItems() {
        this.allItems = [
            {
                id: 'info',
                title: 'Info',
                icon: 'info',
                color: 'blue',
                onClick: this.onShowInfo.bind(this)
            },
            {
                id: 'pin',
                title: 'Pin',
                icon: this.instances.nodesSet.isNodePinned(this.nodeID) ? 'pin-off' : 'pin',
                color: 'red',
                onClick: this.onPin.bind(this)
            },
        ];


        if (this.instances.settings.enableFeatures[this.instances.type]['links']) {
            this.allItems.push({
                id: 'links',
                title: 'Links',
                icon: 'link',
                color: 'orange',
                onMouseEnter: (() => this.onShowInteractive(LINK_KEY)),
                onMouseLeave: this.clearInteractivesList.bind(this),
            });
        }


        if (this.instances.settings.enableFeatures[this.instances.type]['folders']) {
            this.allItems.push({
                id: 'folders',
                title: 'Folders',
                icon: 'folder',
                color: 'green',
                onMouseEnter: (() => this.onShowInteractive(FOLDER_KEY)),
                onMouseLeave: this.clearInteractivesList.bind(this),
            });
        }

        // File node
        if (this.nodeType === "") {
            if (this.instances.settings.enableFeatures[this.instances.type]['tags']) {
                this.allItems.push({
                    id: 'tags',
                    title: 'Tags',
                    icon: 'tags',
                    color: 'pink',
                    onMouseEnter: (() => this.onShowInteractive(TAG_KEY)),
                    onMouseLeave: this.clearInteractivesList.bind(this),
                });
            }


            if (this.instances.settings.enableFeatures[this.instances.type]['properties']) {
                const propertiesItem: RadialMenuItem = {
                    id: 'properties',
                    title: 'Properties',
                    icon: 'archive',
                    color: 'purple',
                    items: []
                };

                const colors = ['red', 'orange ', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'];
                let i = 0;
                for (const [prop, enable] of Object.entries(this.instances.settings.additionalProperties)) {
                    if (enable[this.instances.type] && this.getInteractivesTypes(prop).size > 0) {
                        const propertyItems: RadialMenuItem = {
                            id: prop,
                            title: prop,
                            icon: '',
                            color: colors[i % colors.length],
                            items: [],
                            onMouseEnter: (() => this.onShowInteractive(prop)),
                            onMouseLeave: this.clearInteractivesList.bind(this),
                        };
                        propertiesItem.items?.push(propertyItems);
                        ++i;
                    }
                }

                if (propertiesItem.items && propertiesItem.items.length > 0) {
                    this.allItems.push(propertiesItem);
                }
            }
        }

    }

    setCurrentMenu(menu: RadialMenu) {
        this.clearInteractivesList();
        this.menu = menu;
    }

    private onShowInfo(): void {
        const modal = new GraphStateModal(this.instances);
        modal.setTarget('nodes', this.nodeID);
        modal.open();
    }

    private onPin(): void {
        if (this.instances.nodesSet.isNodePinned(this.nodeID)) {
            this.instances.dispatcher.unpinNodeFromId(this.nodeID);
        }
        else {
            this.instances.dispatcher.pinNodeFromId(this.nodeID);
        }
    }

    private onShowInteractive(key: string): void {
        const manager = this.instances.interactiveManagers.get(key);
        if (!manager) return;

        const types = this.getInteractivesTypes(key);
        if (types.size === 0) return;

        this.clearInteractivesList();
        const div = this.menu.dom.createDiv("interactives-list");

        for (const type of types) {
            const color = manager.getColor(type)

            const typeELement = div.createDiv("interactive-item");
            typeELement.textContent = type;
            typeELement.style.setProperty("--bg-color", `${color[0]}, ${color[1]}, ${color[2]}`);
            typeELement.style.setProperty("--text-color", textColor(color));
            typeELement.toggleClass("is-hidden", !manager.isActive(type));
        }
    }

    private getInteractivesTypes(key: string): Set<string> {
        let extendedElements: ExtendedGraphNode[] | ExtendedGraphLink[] | FolderBlob[];

        if (key === FOLDER_KEY && this.instances.foldersSet) {
            extendedElements = [...this.instances.foldersSet.foldersMap.values()]
                .filter(folder => folder.nodes.find(node => node.id === this.nodeID));
        }
        else if (key === LINK_KEY) {
            extendedElements = [...this.instances.linksSet.extendedElementsMap.values()]
                .filter(link => link.coreElement.source.id === this.nodeID || link.coreElement.target.id === this.nodeID);
        }
        else {
            const extendedNode = this.instances.nodesSet.extendedElementsMap.get(this.nodeID);
            extendedElements = extendedNode ? [extendedNode] : [];
        }
        if (!extendedElements) return new Set();

        const types = new Set<string>(extendedElements.map(element => {
            if ("getTypes" in element && typeof element.getTypes === 'function') return [...(element as ExtendedGraphNode | ExtendedGraphLink).getTypes(key)];
            if ("path" in element && typeof element.path === 'string') return [element.path];
            else return [];
        }).flat().filter(type => type !== this.instances.settings.interactiveSettings[key].noneType));
        return types;
    }

    private clearInteractivesList(): void {
        this.menu.dom.querySelector(".interactives-list")?.detach();
    }
}