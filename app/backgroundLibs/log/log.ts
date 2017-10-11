import { MessageServer, MessageServerChannel } from '../msg/msg';
import { BrowserWindow, remote } from 'electron';

let logChannel: MessageServerChannel<'log'> = null;

function getData(): [Electron.BrowserWindow, MessageServerChannel<'log'>] {
	let win: Electron.BrowserWindow = null;
	if (!BrowserWindow) {
		win = remote.BrowserWindow.getAllWindows()[0];
	} else {
		win = BrowserWindow.getAllWindows()[0];
	}

	if (!logChannel && win) {
		logChannel = new MessageServer({
			activeWindow: win,
			activeWindowPromise: new Promise((resolve) => {
				resolve(win);
			}),
			idGenerator: -1
		}).channel('log');
	}

	return [win, logChannel];
}

const queue: ({
	type: 'info'|'log'|'warn'|'error';
	args: any[];
}|{
	type: 'toast';
	args: string;
})[] = [];

setInterval(() => {
	const [win, logChannel] = getData();
	if (win && queue.length > 0) {
		for (let i = 0; i < queue.length; i++) {
			const queueItem = queue[i];
			logChannel.send(queueItem.type, queueItem.args);
		}

		while (queue[0]) {
			queue.pop();
		}
	}
}, 100);

export function info(...args: any[]) {
	const [win, logChannel] = getData();
	console.info('[BGPAGE]', ...args);
	if (win) {
		logChannel.send('info', args);
	} else {
		queue.push({
			type: 'info',
			args: args
		});
	}
}

export function log(...args: any[]) {
	const [win, logChannel] = getData();
	console.log('[BGPAGE]', ...args);
	if (win) {
		logChannel.send('log', args);
	} else {
		queue.push({
			type: 'log',
			args: args
		});
	}
}

export function warn(...args: any[]) {
	const [win, logChannel] = getData();
	console.warn('[BGPAGE]', ...args);
	if (win) {
		logChannel.send('warn', args);
	} else {
		queue.push({
			type: 'warn',
			args: args
		});
	}
}

export function error(...args: any[]) {
	const [win, logChannel] = getData();
	console.error('[BGPAGE]', ...args);
	if (win) {
		logChannel.send('error', args);
	} else {
		queue.push({
			type: 'error',
			args: args
		});
	}
}

export function toast(message: string) {
	const [win, logChannel] = getData();
	if (win) {
		logChannel.send('toast', message);
	} else {
		queue.push({
			type: 'toast',
			args: message
		});
	}
}