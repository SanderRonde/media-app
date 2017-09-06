import { 
	REMOTE_PORT, INDEX_PATH, EXTERNAL_EVENTS,
	PAPER_RIPPLE_DIR
} from '../constants/constants'

import http = require('http');
import path = require('path');
import urlLib = require('url');
import fs = require('fs');
import ws = require('websocket');

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
				console.log(url, err);
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

	if (command in EXTERNAL_EVENTS) {
		sendCommand(command, activeWindow);
		res.write(JSON.stringify({
			success: true
		}));
	} else {
		respondError(res, 500, 'Server error');
	}
}

const PATH_MAPS = {
	'/': INDEX_PATH,
	'/paper-ripple.css': PAPER_RIPPLE_DIR + 'paper-ripple.min.css',
	'/paper-ripple.css.map': PAPER_RIPPLE_DIR + 'paper-ripple.css.min.map',
	'/PaperRipple.js': PAPER_RIPPLE_DIR + 'PaperRipple.min.js',
	'/PaperRipple.js.map': PAPER_RIPPLE_DIR + 'PaperRipple.js.min.map'
}

function getURL(req: http.IncomingMessage): string {
	const url = urlLib.parse(req.url).pathname;
	if (url in PATH_MAPS) {
		return PATH_MAPS[url as keyof typeof PATH_MAPS];
	}
	return url;
}

class WSHandler {
	private wsServer: ws.WebSocketServer;
	private connections: ws.WebSocketConnection[] = [];

	constructor(server: http.Server) {
		this.wsServer = new ws.WebSocketServer({
			httpServer: server,
			autoAcceptConnections: true
		});
		this.wsServer.on('request', (request) => {
			const connection = request.accept('echo-protocol', request.origin);
			this.connections.push(connection);
			connection.on('close', () => {
				this.connections.splice(this.connections.indexOf(connection, 1));
			});
		});
	}

	sendMessage(message: {
		type: string;
		data: {
			app: string;
			status: string;
		};
	}) {
		this.connections.forEach((connection) => {
			connection.sendUTF(JSON.stringify(message));
		});
	}
}

export class RemoteServer {
	private httpServer: http.Server;
	private wsHandler: WSHandler;

	constructor(activeWindow: Electron.BrowserWindow) {
		this.httpServer = http.createServer(async (req, res) => {
			const url = getURL(req);

			if (url.startsWith('/api/')) {
				handleAPIRequest(url, res, activeWindow);
			} else {
				handleFileRequest(url, res);
			}
		}).listen(REMOTE_PORT, async () => {
			console.log(`HTTP server listening on ${await getIp()}:${REMOTE_PORT}`)
		}) as http.Server;

		this.wsHandler = new WSHandler(this.httpServer);
	}

	sendMessage(message: {
		type: string;
		data: {
			app: string;
			status: string;
		};
	}) {
		this.wsHandler.sendMessage(message);
	}
}