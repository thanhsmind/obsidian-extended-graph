import { ExtendedGraphInstances } from './internal';

export function logToFile(message: string) {
    console.debug(message);
    const path = ExtendedGraphInstances.app.vault.configDir + "/plugins/extended-graph/logs.txt";
    const data = `[${new Date(Date.now()).toISOString()}] ${message}\n`;
    ExtendedGraphInstances.app.vault.adapter.append(path, data);
}