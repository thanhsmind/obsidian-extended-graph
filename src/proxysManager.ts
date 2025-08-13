type Target = {
    owner: any,
    property: string,
    coreTarget: any
};

export class ProxysManager {

    readonly proxyKey = "__isExtendedGraphProxy";
    coreTargets: Map<any, Target> = new Map(); // key: proxy, value: core target

    registerProxy<T extends object>(owner: any, property: string, handler: ProxyHandler<T>): any {
        if (!(property in owner)) {
            console.warn("Invalid property while creating proxy:", property);
            return;
        }

        const coreTarget = owner[property];
        if (!coreTarget) {
            console.warn("Trying to create a proxy for a undefined or null property:", property);
            return;
        }
        if (this.isProxy(coreTarget)) {
            //console.warn("Already a proxy:", property, owner);
            return;
        }

        const proxy = new Proxy(owner[property], handler);
        owner[property] = proxy;
        proxy[this.proxyKey] = true;

        this.coreTargets.set(proxy, {
            owner,
            property,
            coreTarget
        });

        return proxy;
    }

    isProxy(target: any) {
        return this.proxyKey in target && target[this.proxyKey] === true;
    }

    private getTargetForOwner(owner: any, property: string): Target | undefined {
        return [...this.coreTargets.values()].find(el => el.owner === owner && property === property);
    }

    getTargetForProxy(proxy: Object | null | undefined) {
        if (proxy === null || proxy === undefined) {
            return;
        }
        return this.coreTargets.get(proxy)?.coreTarget;
    }

    unregisterProxy(proxy: Object | null | undefined) {
        if (proxy === null || proxy === undefined) {
            return;
        }
        if (!this.isProxy(proxy)) {
            return;
        }

        const found = this.coreTargets.get(proxy);
        if (found) {
            const { owner, property, coreTarget } = found;
            this.coreTargets.delete(proxy);

            if (owner[property] === proxy) {
                owner[property] = coreTarget;
            }
            else {
                console.warn("The core reference is no longer pointing to the proxy. Instead :");
                console.warn(owner[property]);
            }
        }
        else {
            //console.warn("Proxy not found");
        }
    }

    unregisterAll() {
        for (const [proxy, element] of this.coreTargets) {
            const { owner, property, coreTarget } = element;
            this.coreTargets.delete(proxy);
            if (owner[property] === proxy) {
                owner[property] = coreTarget;
            }
        }
    }
}