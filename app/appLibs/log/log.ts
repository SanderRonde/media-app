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

const toasts: string[] = [];

window.setInterval(() => {
	const win = getWindow();
	if (win && toasts.length > 0) {
		for (let i = 0; i < toasts.length; i++) {
			win.webContents.send('log', {
				type: 'toast',
				args: toasts[i]
			});
		}

		while (toasts[0]) {
			toasts.pop();
		}
	}
});

export function toast(message: string) {
	const win = getWindow();
	if (win) {
		win.webContents.send('log', {
			type: 'toast',
			args: message
		});
	} else {
		toasts.push(message);
	}
}