import { randomUUID } from "crypto";

const util = require('util');

type Target = {
    owner: any,
    property: string,
    coreTarget: any
};

export class ProxysManager {

    coreTargets: Map<any, Target> = new Map(); // key: proxy, value: core target

    registerProxy<T extends object>(owner: any, property: string, handler: ProxyHandler<T>): void {
        if (!(property in owner)) return;

        const coreTarget = owner[property];
        if (!coreTarget) return;
        if (this.isProxy(coreTarget)) return;

        //console.log("Register proxy,", property);

        const proxy = new Proxy(owner[property], handler);
        owner[property] = proxy;

        let id = randomUUID();
        while (this.coreTargets.has(id)) {
            id = randomUUID();
        }

        this.coreTargets.set(proxy, {
            owner,
            property,
            coreTarget
        });
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

            //console.log("Unregister proxy,", property);

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