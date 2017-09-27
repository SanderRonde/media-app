import { BrowserWindow, remote } from 'electron';
import { Helpers } from '../../window/libs/helpers';

function getWindow(): Electron.BrowserWindow {
	if (!BrowserWindow) {
		return remote.BrowserWindow.getAllWindows()[0];
	}
	return BrowserWindow.getAllWindows()[0];
}

const queue: ({
	type: 'info'|'log'|'warn'|'error';
	args: any[];
}|{
	type: 'toast';
	args: string;
})[] = [];

setInterval(() => {
	const win = getWindow();
	if (win && queue.length > 0) {
		for (let i = 0; i < queue.length; i++) {
			const queueItem = queue[i];
			/// Why does this work typescript
			if (queueItem.type === 'toast') {
				Helpers.sendIPCMessage('log', {
					type: queueItem.type,
					args: queueItem.args
				}, win.webContents);
			} else {
				Helpers.sendIPCMessage('log', {
					type: queueItem.type,
					args: queueItem.args
				}, win.webContents);
			}
		}

		while (queue[0]) {
			queue.pop();
		}
	}
}, 100);

export function info(...args: any[]) {
	const win = getWindow();
	console.info(...args);
	if (win) {
		Helpers.sendIPCMessage('log', {
			type: 'info',
			args: args
		}, win.webContents);
	} else {
		queue.push({
			type: 'info',
			args: args
		});
	}
}

export function log(...args: any[]) {
	const win = getWindow();
	console.log(...args);
	if (win) {
		Helpers.sendIPCMessage('log', {
			type: 'log',
			args: args
		}, win.webContents);
	} else {
		queue.push({
			type: 'log',
			args: args
		});
	}
}

export function warn(...args: any[]) {
	const win = getWindow();
	console.warn(...args);
	if (win) {
		Helpers.sendIPCMessage('log', {
			type: 'warn',
			args: args
		}, win.webContents);
	} else {
		queue.push({
			type: 'warn',
			args: args
		});
	}
}

export function error(...args: any[]) {
	const win = getWindow();
	console.error(...args);
	if (win) {
		Helpers.sendIPCMessage('log', {
			type: 'error',
			args: args
		}, win.webContents);
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
		Helpers.sendIPCMessage('log', {
			type: 'toast',
			args: message
		}, win.webContents);
	} else {
		queue.push({
			type: 'toast',
			args: message
		});
	}
}