import { BrowserWindow } from 'electron';

export function log(...args: any[]) {
	const currentWindow = BrowserWindow.getAllWindows()[0];
	currentWindow && currentWindow.webContents.send('log', {
		type: 'log',
		args: args
	});
}