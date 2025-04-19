import { randomUUID } from "crypto";

const util = require('util');

type Target = {
    owner: any,
    property: string,
    coreTarget: any
};

export class ProxysManager {

    coreTargets: Map<any, Target> = new Map(); // key: proxy, value: core target

    registerProxy<T extends object>(owner: any, property: string, handler: ProxyHandler<T>): any {
        if (!(property in owner)) {
            console.warn("Invalid property");
            return;
        }

        const coreTarget = owner[property];
        if (!coreTarget) {
            console.warn("Target undefined or null");
            return;
        }
        if (this.isProxy(coreTarget)) {
            console.warn("Already a proxy:", property, owner);
            return;
        }

        const proxy = new Proxy(owner[property], handler);
        owner[property] = proxy;

        this.coreTargets.set(proxy, {
            owner,
            property,
            coreTarget
        });

        return proxy;
    }

    private isProxy(target: any) {
        return util.types.isProxy(target);
    }

    private getTargetForOwner(owner: any, property: string): Target | undefined {
        return [...this.coreTargets.values()].find(el => el.owner === owner && property === property);
    }

    unregisterProxy(proxy: any) {
        if (proxy === null || proxy === undefined) return;

        const found = this.coreTargets.get(proxy);
        if (found) {
            const { owner, property, coreTarget } = found;
            this.coreTargets.delete(proxy);

            owner[property] = coreTarget;
        }
    }

    unregisterAll() {
        for (const [proxy, element] of this.coreTargets) {
            const { owner, property, coreTarget } = element;
            this.coreTargets.delete(proxy);
            owner[property] = coreTarget;
        }
    }
}