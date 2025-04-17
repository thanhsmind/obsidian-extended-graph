
import { GraphLink } from "obsidian-typings";
import { Sprite, Texture, Text, ColorSource, TextStyle } from "pixi.js";
import { getBackgroundColor, getFile, getFileInteractives, getLinkID, GraphInstances, PluginInstances } from "src/internal";

export class ExtendedGraphArrow {
    coreElement: GraphLink;
    instances: GraphInstances;

    hasChangedArrowShape: boolean = false;

    constructor(instances: GraphInstances, coreElement: GraphLink) {
        this.instances = instances;
        this.coreElement = coreElement;
    }

    modifyCoreElement() {
        this.invertArrowDirection();
        this.createFlatArrow();
    }

    unload(): void {
        PluginInstances.proxysManager.unregisterProxy(this.coreElement.arrow);
        this.resetArrowShape();
    }



    private invertArrowDirection(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['arrows'] || !this.instances.settings.invertArrows) return;
        const link = this.coreElement;
        if (link.arrow) {
            const proxy = PluginInstances.proxysManager.registerProxy<typeof link.arrow>(
                this.coreElement,
                "arrow",
                {
                    set(target, prop, value, receiver) {
                        // Place the arrow at the source rather than the target
                        if (prop === "x" || prop === "y") {
                            var c2c_x = link.target.x - link.source.x
                                , c2c_y = link.target.y - link.source.y
                                , diag = Math.sqrt(c2c_x * c2c_x + c2c_y * c2c_y)
                                , source_r = link.source.getSize() * link.renderer.nodeScale;

                            if (prop === "x") {
                                target.x = link.source.x + c2c_x * source_r / diag;
                            }
                            else {
                                target.y = link.source.y + c2c_y * source_r / diag;
                            }
                        }
                        // Flip the arrow
                        else if (prop === "rotation") {
                            target.rotation = value + Math.PI;
                        }
                        else {
                            return Reflect.set(target, prop, value, receiver);
                        }
                        return true;
                    }
                }
            );

            this.coreElement.arrow?.addListener('destroyed', () => PluginInstances.proxysManager.unregisterProxy(proxy));
        }
    }

    private createFlatArrow(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['arrows'] || !this.instances.settings.flatArrows) return;
        const arrow = this.coreElement.arrow;
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
        const arrow = this.coreElement.arrow;
        if (!arrow) return;
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