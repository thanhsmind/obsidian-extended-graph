type Target = {
    owner: any,
    property: string,
    coreTarget: any
};

export class ProxysManager {

    readonly proxyKey = "__isExtendedGraphProxy";
    readonly proxyFunctionKey = "__isExtendedGraphFunctionProxy";
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
        if (this.isProxy(coreTarget, owner, property)) {
            //console.warn("Already a proxy:", property, owner);
            return;
        }

        const proxy = new Proxy(owner[property], handler);
        owner[property] = proxy;
        if (typeof coreTarget === "function") {
            if (!(this.proxyFunctionKey in owner)) {
                owner[this.proxyFunctionKey] = {};
            }
            owner[this.proxyFunctionKey][property] = true;
        }
        else {
            proxy[this.proxyKey] = true;
        }

        this.coreTargets.set(proxy, {
            owner,
            property,
            coreTarget
        });

        return proxy;
    }

    private isProxy(target: any, owner: any, property: string) {
        if (typeof target === "function") {
            if (!owner || !property) {
                throw new Error("Can't check if the function is a proxy without an owner and a property provided.");
            }
            return this.proxyFunctionKey in owner
                && property in owner[this.proxyFunctionKey]
                && owner[this.proxyFunctionKey][property] === true;
        }
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

        const found = this.coreTargets.get(proxy);
        if (found) {
            const { owner, property, coreTarget } = found;
            if (!this.isProxy(proxy, owner, property)) {
                return;
            }
            this.coreTargets.delete(proxy);

            if (owner[property] === proxy) {
                owner[property] = coreTarget;
                delete owner[property][this.proxyKey];
                if (this.proxyFunctionKey in owner && property in owner[this.proxyFunctionKey]) {
                    delete owner[this.proxyFunctionKey][property];
                }
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
                delete owner[property][this.proxyKey];
            }
        }
    }
}