import { Graphics } from "pixi.js"
import { GraphLink, GraphRenderer } from "obsidian-typings";
import { ExtendedGraphLink, ExtendedGraphSettings, GraphInstances, int2rgb, PluginInstances, SettingQuery } from "src/internal";

export class ExtendedGraphArrow {
    extendedLink: ExtendedGraphLink;
    instances: GraphInstances;

    hasChangedArrowShape: boolean = false;
    coreArrowScaleCallback: (() => void) | undefined;

    constructor(instances: GraphInstances, extendedElement: ExtendedGraphLink) {
        this.instances = instances;
        this.extendedLink = extendedElement;
    }

    init() {
        this.modifyCoreElement();
    }

    modifyCoreElement() {
        this.proxyArrow();
        this.createScalleArrowCallback();
        this.createFlatArrow();
    }

    unload(): void {
        PluginInstances.proxysManager.unregisterProxy(this.extendedLink.coreElement.arrow);
        this.restoreArrowScaleCallback();
        this.resetArrowShape();
    }

    // ============================= ARROW PROXY ==============================

    private proxyArrow(): void {
        const needToColorArrows = SettingQuery.needToChangeArrowColor(this.instances);
        const needToChangeArrowAlpha = SettingQuery.needToChangeArrowAlpha(this.instances);
        if (!this.instances.settings.invertArrows
            && !needToColorArrows
            && !needToChangeArrowAlpha
        ) return;


        const link = this.extendedLink.coreElement;
        if (link.arrow) {


            const modifyingFunctions: ((target: Graphics, prop: string | symbol, value: any) => boolean)[] = [];
            if (this.instances.settings.invertArrows) modifyingFunctions.push(this.invertArrow.bind(this));
            if (needToColorArrows) modifyingFunctions.push(this.colorArrow.bind(this));
            if (needToChangeArrowAlpha) modifyingFunctions.push(this.makeArrowOpaque.bind(this));

            const modifyArrow = ((target: Graphics, prop: string | symbol, value: any): boolean => {
                return modifyingFunctions.some(fn => fn(target, prop, value));
            }).bind(this)

            PluginInstances.proxysManager.registerProxy<typeof link.arrow>(
                this.extendedLink.coreElement,
                "arrow",
                {
                    set(target, prop, value, receiver) {
                        const modified = modifyArrow(target, prop, value);
                        return modified ? true : Reflect.set(target, prop, value, receiver);
                    }
                }
            );
            link.arrow.addListener('destroyed', () => {
                PluginInstances.proxysManager.unregisterProxy(this.extendedLink.coreElement.arrow);
            })
        }
    }

    // ============================= OPAQUE COLOR =============================

    private makeArrowOpaque(target: Graphics, prop: string | symbol, value: any): boolean {
        if (prop === "alpha") {
            const highlightNode = this.extendedLink.coreElement.renderer.getHighlightNode();
            if (highlightNode && this.extendedLink.coreElement.source !== highlightNode
                && this.extendedLink.coreElement.target !== highlightNode) {
                return Reflect.set(target, prop, value);
            }
            return Reflect.set(target, prop, 1);
        }
        return false;
    }

    // ============================= ARROW COLOR ==============================

    private colorArrow(target: Graphics, prop: string | symbol, value: any): boolean {
        if (prop === "tint") {
            if (this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows']
                && this.extendedLink.instances.settings.arrowColorBool
                && this.extendedLink.instances.settings.arrowColor !== "") {
                value = this.extendedLink.instances.settings.arrowColor;
            }
            else if (this.extendedLink.coreElement.line?.worldVisible) {
                value = this.extendedLink.coreElement.line.tint;
            }
            else if (this.extendedLink.siblingLink?.coreElement.line?.worldVisible) {
                value = this.extendedLink.siblingLink.coreElement.line.tint;
            }
            return Reflect.set(target, prop, value);
        }
        return false;
    }

    // =========================== ARROW DIRECTION ============================

    private invertArrow(target: Graphics, prop: string | symbol, value: any): boolean {
        // Place the arrow at the source rather than the target
        if (prop === "x" || prop === "y") {
            const link = this.extendedLink.coreElement;
            var c2c_x = link.target.x - link.source.x
                , c2c_y = link.target.y - link.source.y
                , diag = Math.sqrt(c2c_x * c2c_x + c2c_y * c2c_y)
                , source_r = link.source.getSize() * link.renderer.nodeScale;

            if (prop === "x") {
                value = link.source.x + c2c_x * source_r / diag;
            }
            else {
                value = link.source.y + c2c_y * source_r / diag;
            }
            return Reflect.set(target, prop, value);
        }
        // Flip the arrow
        else if (prop === "rotation") {
            value = value + Math.PI;
            return Reflect.set(target, prop, value);
        }
        return false
    }

    // ============================= ARROW SCALE ==============================


    private createScalleArrowCallback() {
        if (this.coreArrowScaleCallback) return;
        if (!SettingQuery.needToChangeArrowScale(this.extendedLink.instances)) return;

        const scale = this.extendedLink.coreElement.arrow?.scale;
        if (scale) {
            const scaleArrow = this.scaleArrow.bind(this);
            this.coreArrowScaleCallback = scale.cb;
            const coreArrowScaleCallback = scale.cb;
            scale.cb = () => {
                scaleArrow();
                coreArrowScaleCallback.call(scale.scope);
            }
            scaleArrow();
        }
    }

    private restoreArrowScaleCallback() {
        if (!this.coreArrowScaleCallback) return;

        const scale = this.extendedLink.coreElement.arrow?.scale;
        if (scale) {
            scale.cb = this.coreArrowScaleCallback;
            this.coreArrowScaleCallback = undefined;
        }
    }

    private scaleArrow() {
        const link = this.extendedLink.coreElement;
        const arrow = link.arrow;
        if (!arrow) return;

        arrow.scale._x = arrow.scale._y =
            (this.instances.settings.arrowFixedSize
                ? 2 * Math.sqrt(link.renderer.fLineSizeMult) * link.renderer.nodeScale
                : arrow.scale._y)
            * this.instances.settings.arrowScale;
    }

    // ============================= ARROW SHAPE ==============================

    private createFlatArrow(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['arrows'] || !this.instances.settings.flatArrows) return;
        const arrow = this.extendedLink.coreElement.arrow;
        if (!arrow) return;
        arrow.clear();
        arrow.beginFill(16777215);
        arrow.moveTo(0, 0);
        arrow.lineTo(-4, -2);
        arrow.lineTo(-4, 2);
        arrow.lineTo(0, 0);
        arrow.endFill();
        this.hasChangedArrowShape = true;
    }

    private resetArrowShape(): void {
        if (!this.hasChangedArrowShape) return;
        const arrow = this.extendedLink.coreElement.arrow;
        if (!arrow || arrow.destroyed) return;
        arrow.clear();
        arrow.beginFill(16777215);
        arrow.moveTo(0, 0);
        arrow.lineTo(-4, -2);
        arrow.lineTo(-3, 0);
        arrow.lineTo(-4, 2);
        arrow.lineTo(0, 0);
        arrow.endFill();
    }
}