import { BrowserWindow } from 'electron';

function getWindow(): Electron.BrowserWindow {
	const currentWindow = BrowserWindow.getAllWindows()[0];
	return currentWindow;
}

export function info(...args: any[]) {
	const win = getWindow();
	win && win.webContents.send('log', {
		type: 'info',
		args: args
	});
}

export function log(...args: any[]) {
	const win = getWindow();
	win && win.webContents.send('log', {
		type: 'log',
		args: args
	});
}

export function warn(...args: any[]) {
	const win = getWindow();
	win && win.webContents.send('log', {
		type: 'warn',
		args: args
	});
}

export function error(...args: any[]) {
	const win = getWindow();
	win && win.webContents.send('log', {
		type: 'error',
		args: args
	});
}