import { GraphLink, GraphNode } from "obsidian-typings";
import { Container } from "pixi.js";
import { GraphicsWrapper, GraphInstances, GraphType, InteractiveManager } from "src/internal";

export abstract class ExtendedGraphElement<T extends GraphNode | GraphLink> {
    instances: GraphInstances;
    types: Map<string, Set<string>>;
    managers: Map<string, InteractiveManager>;
    coreElement: T;
    graphicsWrapper?: GraphicsWrapper<T>;
    id: string;
    isActive: boolean = true;

    // ============================== CONSTRUCTOR ==============================

    constructor(instances: GraphInstances, coreElement: T, types: Map<string, Set<string>>, managers: InteractiveManager[]) {
        this.instances = instances;
        this.coreElement = coreElement;
        this.id = this.getID();
        this.managers = new Map<string, InteractiveManager>();
        this.types = types;

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

    // ================================= UNLOAD ================================

    unload() {
        this.graphicsWrapper?.disconnect();
        this.graphicsWrapper?.clearGraphics();
        this.graphicsWrapper?.destroyGraphics();
    }

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

    protected abstract isCoreElementUptodate(): boolean;
    abstract isSameCoreElement(coreElement: T): boolean;
    abstract getCoreCollection(): T[];
    protected abstract getCoreParentGraphics(coreElement: T): Container | null;


    // ================================ GETTERS ================================

    isAnyManagerDisabled(): boolean {
        for (const [key, manager] of this.managers) {
            const types = this.getTypes(key);
            if (types.size === 0) continue;
            if ([...types].every(type => !manager.isActive(type))) return true;
        }
        return false;
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

    matchesTypes(key: string, newTypes: string[]): { typesToRemove: string[], typesToAdd: string[] } {
        const currentTypes = this.getTypes(key);
        const typesToRemove = structuredClone(currentTypes);
        const typesToAdd = structuredClone(newTypes);
        for (const type of newTypes) {
            if (currentTypes.has(type)) {
                typesToRemove.delete(type);
                typesToAdd.remove(type);
            }
        }
        return { typesToRemove: [...typesToRemove], typesToAdd: typesToAdd };
    }

    hasType(key: string, type: string): boolean {
        return !!this.types.get(key)?.has(type);
    }

    getTypes(key: string): Set<string> {
        const types = this.types.get(key);
        return types ? types : new Set<string>();
    }

    abstract getID(): string;


    // ================================ SETTERS ================================

    setTypes(key: string, types: Set<string>) {
        this.types.set(key, types);
        const managerGraphics = this.graphicsWrapper?.managerGraphicsMap?.get(key);
        if (managerGraphics) managerGraphics.types = types;
    }

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