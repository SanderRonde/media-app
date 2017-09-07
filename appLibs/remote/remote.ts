import { 
	REMOTE_PORT, INDEX_PATH, EXTERNAL_EVENTS,
	PAPER_RIPPLE_DIR, EXTERNAL_EVENT, ICONS_DIR
} from '../constants/constants'

import ws = require('websocket');
import urlLib = require('url');
import http = require('http');
import path = require('path');
import jade = require('jade');
import fs = require('fs');

type WSMessage = {
	type: 'statusUpdate';
	data: {
		app: string;
		status: string;
	};
}|{
	type: 'playUpdate';
	data: {
		playing: boolean;
	}
}

const PATH_MAPS = {
	'/': INDEX_PATH,
	'/paper-ripple.css': PAPER_RIPPLE_DIR + 'paper-ripple.min.css',
	'/paper-ripple.css.map': PAPER_RIPPLE_DIR + 'paper-ripple.css.min.map',
	'/PaperRipple.js': PAPER_RIPPLE_DIR + 'PaperRipple.min.js',
	'/PaperRipple.js.map': PAPER_RIPPLE_DIR + 'PaperRipple.js.min.map',
	'/images/48.png': ICONS_DIR + '48.png',
	'/images/72.png': ICONS_DIR + '72.png',
	'/images/96.png': ICONS_DIR + '96.png',
	'/images/144.png': ICONS_DIR + '144.png',
	'/images/168.png': ICONS_DIR + '168.png',
	'/images/192.png': ICONS_DIR + '192.png'
}

class WSHandler {
	private wsServer: ws.server;
	private connections: ws.WebSocketConnection[] = [];

	constructor(server: http.Server) {
		this.wsServer = new ws.server({
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

	sendMessage(message: WSMessage) {
		this.connections.forEach((connection) => {
			connection.sendUTF(JSON.stringify(message));
		});
	}
}

export class RemoteServer {
	private httpServer: http.Server;
	private wsHandler: WSHandler;
	private lastState: {
		app: string;
		status: string;
		playing: boolean;
	} = {
		app: 'Music',
		status: '',
		playing: true
	}

	private OPTIONS_MAPS = {
		[INDEX_PATH]: this.lastState
	}

	constructor(activeWindow: Electron.BrowserWindow) {
		this.httpServer = http.createServer(async (req, res) => {
			const url = this.getURL(req);

			if (url.startsWith('/api/')) {
				this.handleAPIRequest(url, res, activeWindow);
			} else {
				this.handleFileRequest(url, res);
			}
		}).listen(REMOTE_PORT, async () => {
			console.log(`HTTP server listening on ${await this.getIp()}:${REMOTE_PORT}`)
		}) as http.Server;

		this.wsHandler = new WSHandler(this.httpServer);
	}

	private getIp() {
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
	
	private getStatusCode(url: string): Promise<[number, string]> {
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
	
	private respondError(res: http.ServerResponse, statusCode: number, statusMessage: string) {
		res.writeHead(statusCode, statusMessage);
		res.end();
	}

	private getFileType(file: string): string {
		return file.split('.').reverse()[0];
	}

	private getJadeOptionsForFile(fileName: string): {
		[key: string]: any;
	} {
		if (fileName in this.OPTIONS_MAPS) {
			const OPTIONS_MAPS = this.OPTIONS_MAPS;
			return this.OPTIONS_MAPS[fileName as keyof typeof OPTIONS_MAPS];
		}
		return {};
	}

	private renderJade(fileName: string, fileContents: string): string {
		const options = this.getJadeOptionsForFile(fileName);
		return jade.compile(fileContents)(options);
	}

	private renderData(fileName: string, fileContents: string): string {
		const fileType = this.getFileType(fileName);
		switch (fileType) {
			case 'jade':
				return this.renderJade(fileName, fileContents);
		}
		return fileContents;
	}
	
	private serveFile(url: string, res: http.ServerResponse) {
		fs.readFile(path.join(__dirname, 'client/', url), {
			encoding: 'utf8'
		}, (err, data) => {
			if (err) {
				this.respondError(res, 500, 'Server error');
			} else {			
				res.write(this.renderData(url, data));
				res.end();
			}
		});
	}
	
	private async handleFileRequest(url: string, res: http.ServerResponse) {
		const [ statusCode, statusMessage ] = await this.getStatusCode(url);
		if (statusCode !== 200) {
			this.respondError(res, statusCode, statusMessage);
		}
	
		this.serveFile(url, res);
	}
	
	private sendCommand(command: string, activeWindow: Electron.BrowserWindow) {
		activeWindow && activeWindow.webContents.send('fromBgPage', {
			cmd: command,
			type: 'event'
		});
	}
	
	private async handleAPIRequest(url: string, res: http.ServerResponse, activeWindow: Electron.BrowserWindow) {
		const command = url.split('/api/').slice(1).join('/api/');
	
		if (EXTERNAL_EVENTS.indexOf(command as EXTERNAL_EVENT) > -1) {
			this.sendCommand(command, activeWindow);
			res.write(JSON.stringify({
				success: true
			}));
		} else {
			this.respondError(res, 500, 'Server error');
		}
	}
	
	private getURL(req: http.IncomingMessage): string {
		const url = urlLib.parse(req.url).pathname;
		if (url in PATH_MAPS) {
			return PATH_MAPS[url as keyof typeof PATH_MAPS];
		}
		return url;
	}

	private updateLastState(state: WSMessage) {
		if (state.type === 'playUpdate') {
			this.lastState.playing = state.data.playing;
		} else {
			this.lastState.app = state.data.app;
			this.lastState.status = state.data.status;
		}
	}

	sendMessage(message: WSMessage) {
		this.updateLastState(message);		
		this.wsHandler.sendMessage(message);
	}
}