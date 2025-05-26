import { getFile, NodeStatCalculator, PluginInstances } from "src/internal";

export class BacklinkCountCalculator extends NodeStatCalculator {

    override async getStat(id: string, invert: boolean): Promise<number> {
        const file = getFile(id);
        if (file) {
            if (!invert) {
                const backlinks = PluginInstances.app.metadataCache.getBacklinksForFile(file);
                if (file.path.contains("Carl.md")) {
                    console.log(backlinks);
                }
                return backlinks.count();
            }
            else {
                const links = PluginInstances.app.metadataCache.resolvedLinks[file.path];
                return links ? Object.values(links).reduce((a: number, b: number, i: number, arr: number[]) => a + b, 0) : 0;
            }
        }
        else {
            if (!invert) {
                let count = 0;
                Object.entries(PluginInstances.app.metadataCache.unresolvedLinks).forEach(([source, unresolvedLinks]) => {
                    if (id in unresolvedLinks) {
                        count += unresolvedLinks[id];
                    }
                });
                return count;
            }
            else {
                // 0 forward links for unresolved nodes
                return 0;
            }
        }
    }
}