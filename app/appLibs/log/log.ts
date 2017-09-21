import { BrowserWindow } from 'electron';

function getWindow(): Electron.BrowserWindow {
	const currentWindow = BrowserWindow.getAllWindows()[0];
	return currentWindow;
}

const queue: {
	type: string;
	args: any|any[];
}[] = [];

window.setInterval(() => {
	const win = getWindow();
	if (win && queue.length > 0) {
		for (let i = 0; i < queue.length; i++) {
			win.webContents.send('log', {
				type: queue[i].type,
				args: queue[i].args
			});
		}

		while (queue[0]) {
			queue.pop();
		}
	}
}, 100);

export function info(...args: any[]) {
	const win = getWindow();
	if (win) {
		win.webContents.send('log', {
			type: 'info',
			args: args
		});
	} else {
		queue.push({
			type: 'info',
			args: args
		});
	}
}

export function log(...args: any[]) {
	const win = getWindow();
	if (win) {
		win.webContents.send('log', {
			type: 'log',
			args: args
		});
	} else {
		queue.push({
			type: 'log',
			args: args
		});
	}
}

export function warn(...args: any[]) {
	const win = getWindow();
	if (win) {
		win.webContents.send('log', {
			type: 'warn',
			args: args
		});
	} else {
		queue.push({
			type: 'warn',
			args: args
		});
	}
}

export function error(...args: any[]) {
	const win = getWindow();
	if (win) {
		win.webContents.send('log', {
			type: 'error',
			args: args
		});
	} else {
		queue.push({
			type: 'error',
			args: args
		});
	}
}

export function toast(message: string) {
	const win = getWindow();
	if (win) {
		win.webContents.send('log', {
			type: 'toast',
			args: message
		});
	} else {
		queue.push({
			type: 'toast',
			args: message
		});
	}
}