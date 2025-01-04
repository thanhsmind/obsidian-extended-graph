import { App } from 'obsidian';

export function logToFile(app: App, message: string) {
    console.log(message);
    const path = app.vault.configDir + "/plugins/extended-graph/logs.txt";
    const data = `[${new Date(Date.now()).toISOString()}] ${message}\n`;
    app.vault.adapter.append(path, data);
}