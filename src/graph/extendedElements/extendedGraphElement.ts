import { GraphLink, GraphNode } from "obsidian-typings";
import { InteractiveManager } from "../interactiveManager";
import { ExtendedGraphSettings } from "src/settings/settings";
import { GraphicsWrapper } from "../graphicElements/links/graphicsWrapper";
import { Container, Graphics } from "pixi.js";

export abstract class ExtendedGraphElement<T extends GraphNode | GraphLink> {
    settings: ExtendedGraphSettings;
    types: Map<string, Set<string>>;
    managers: Map<string, InteractiveManager>;
    coreElement: T;
    graphicsWrapper?: GraphicsWrapper<T>;
    id: string;
    isActive: boolean = true;

    // ============================== CONSTRUCTOR ==============================
    
    constructor(coreElement: T, types: Map<string, Set<string>>, managers: InteractiveManager[], settings: ExtendedGraphSettings) {
        this.coreElement = coreElement;
        this.id = this.getID();
        this.managers = new Map<string, InteractiveManager>();
        this.types = types;
        this.settings = settings;

        for (const manager of managers) {
            const key = manager.name;
            this.managers.set(key, manager);
        }
    }

    protected initGraphicsWrapper() {
        if (this.needGraphicsWrapper()) {
            this.createGraphicsWrapper();
        }
    }
    
    protected abstract needGraphicsWrapper(): boolean;
    protected abstract createGraphicsWrapper(): void;

    // ============================== CORE ELEMENT =============================

    updateCoreElement(): void {
        this.setCoreElement(this.findCoreElement());
    }

    setCoreElement(coreElement: T | undefined): void {
        if (!coreElement) return;
        if (!this.getCoreCollection().includes(coreElement)) {
            coreElement.clearGraphics();
            return;
        }
        else if (this.getCoreCollection().includes(this.coreElement) && this.coreElement !== coreElement) {
            this.getCoreCollection().remove(this.coreElement);
            this.coreElement.clearGraphics();
            this.graphicsWrapper?.disconnect();
        }
        else if (this.getCoreParentGraphics(this.coreElement) !== this.getCoreParentGraphics(coreElement)) {
            this.coreElement.clearGraphics();
            this.graphicsWrapper?.disconnect();
        }
        this.coreElement = coreElement;
        this.graphicsWrapper?.connect();
    }

    protected findCoreElement(): T | undefined {
        if (!this.isCoreElementUptodate()) {
            const newElement = this.getCoreCollection().find(n => this.isSameCoreElement(n));
            return newElement;
        }
        return this.coreElement;
    }

    protected abstract clearGraphicsButKeepRendered(): void;
    protected abstract isCoreElementUptodate(): boolean;
    abstract isSameCoreElement(coreElement: T): boolean;
    abstract getCoreCollection(): T[];
    protected abstract getCoreParentGraphics(coreElement: T): Container | null;
    protected abstract setCoreParentGraphics(coreElement: T): void;


    // ================================ GETTERS ================================

    isAnyManagerDisabled(): boolean {
        for (const [key, manager] of this.managers) {
            const types = this.getTypes(key);
            if (types.size === 0) continue;
            if ([...types].every(type => !manager.isActive(type))) return true;
        }
        return  false;
    }

    getActiveType(key: string): string | undefined {
        const manager = this.managers.get(key);
        if (!manager) return;
        const types = this.getTypes(key);
        for (const type of types) {
            if (manager.isActive(type)) return type;
        }
        return;
    }

    matchesTypes(key: string, types: string[]): boolean {
        return types.sort().join(',') === [...this.getTypes(key)].join(',');
    }

    hasType(key: string, type: string): boolean {
        return !!this.types.get(key)?.has(type);
    }

    getTypes(key: string): Set<string> {
        const types = this.types.get(key);
        return types ? types : new Set<string>();
    }

    abstract getID(): string;

    // ================================ TOGGLE =================================

    disableType(key: string, type: string) {
        this.graphicsWrapper?.managerGraphicsMap?.get(key)?.toggleType(type, false);
    }

    enableType(key: string, type: string) {
        this.graphicsWrapper?.managerGraphicsMap?.get(key)?.toggleType(type, true);
    }

    disable() {
        this.isActive = false;
        this.updateCoreElement();
    }

    enable() {
        this.isActive = true;
        this.graphicsWrapper?.connect();
    }
}