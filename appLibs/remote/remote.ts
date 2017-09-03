import { REMOTE_PORT, INDEX_PATH, EXTERNAL_EVENTS } from '../constants/constants'

import http = require('http');
import path = require('path');
import fs = require('fs');

function getIp() {
	return new Promise((resolve, reject) => {
		require('dns').lookup(require('os').hostname(), (err: Error, address: string) => {
			if (err) {
				reject(err);
			} else {
				resolve(address);
			}
		});
	});
}

function getStatusCode(url: string): Promise<[number, string]> {
	return new Promise((resolve, reject) => {
		fs.stat(path.join(__dirname, 'client/', url), (err, stats) => {
			if (err) {
				resolve([404, 'Not found']);
			} else {
				if (stats.isFile()) {
					resolve([200, 'OK']);
				} else {
					resolve([403, 'Unauthorized']);
				}
			}
		});
	});
}

function respondError(res: http.ServerResponse, statusCode: number, statusMessage: string) {
	res.writeHead(statusCode, statusMessage);
	res.end();
}

function serveFile(url: string, res: http.ServerResponse) {
	fs.readFile(path.join(__dirname, 'client/', url), (err, data) => {
		if (err) {
			respondError(res, 500, 'Server error');
		} else {
			res.write(data);
			res.end();
		}
	});
}

async function handleFileRequest(url: string, res: http.ServerResponse) {
	const [ statusCode, statusMessage ] = await getStatusCode(url);
	if (statusCode !== 200) {
		respondError(res, statusCode, statusMessage);
	}

	serveFile(url, res);
}

function sendCommand(command: string, activeWindow: Electron.BrowserWindow) {
	activeWindow && activeWindow.webContents.send('fromBgPage', {
		cmd: command,
		type: 'event'
	});
}

async function handleAPIRequest(url: string, res: http.ServerResponse, activeWindow: Electron.BrowserWindow) {
	const command = url.split('/api/').slice(1).join('/api/');

	if (EXTERNAL_EVENTS.indexOf(command) > -1) {
		sendCommand(command, activeWindow);
	} else {
		respondError(res, 500, 'Server error');
	}
}

function getURL(req: http.IncomingMessage): string {
	const url = new URL(req.url).pathname;
	if (url === '/') {
		return INDEX_PATH;
	}
	return url;
}

export function initalize(activeWindow: Electron.BrowserWindow) {
	http.createServer(async (req, res) => {
		const url = getURL(req);

		if (url.startsWith('/api/')) {
			handleAPIRequest(url, res, activeWindow);
		} else {
			handleFileRequest(url, res);
		}

	}).listen(REMOTE_PORT, async () => {
		console.log(`HTTP server listening on ${await getIp}:${REMOTE_PORT}`)
	});
}