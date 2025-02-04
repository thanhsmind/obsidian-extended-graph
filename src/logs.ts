import { PluginInstances } from './internal';

export function logToFile(message: string) {
    console.log(message);
    const path = PluginInstances.app.vault.configDir + "/plugins/extended-graph/logs.txt";
    const data = `[${new Date(Date.now()).toISOString()}] ${message}\n`;
    PluginInstances.app.vault.adapter.append(path, data);
}