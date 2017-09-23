import { 
	REMOTE_PORT, INDEX_PATH, EXTERNAL_EVENTS,
	ICONS_DIR, SW_TOOLBOX_DIR, LOG_ERROR_REQUESTS, 
	LOG_REQUESTS, ARG_EVENTS
} from '../constants/constants'

import { Helpers } from '../../window/libs/helpers';
import { log, error, toast } from '../log/log';
import ws = require('websocket');
import urlLib = require('url');
import http = require('http');
import path = require('path');
import jade = require('jade');
import net = require('net');
import fs = require('fs');

interface NodeError extends Error {
	code: string;
}

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

const STATUS_CODES = {
	200: 'OK',
	404: 'Not Found',
	403: 'Unauthorized',
	500: 'Server error'
}

class WSHandler {
	private wsServer: ws.server;
	private connections: ws.WebSocketConnection[] = [];

	constructor(server?: http.Server) {
		if (!server) {
			return;
		}

		this.wsServer = new ws.server({
			httpServer: server,
			autoAcceptConnections: false
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
	PATH_MAPS = {
		'/': INDEX_PATH,
		'/sw-toolbox.js': SW_TOOLBOX_DIR + 'sw-toolbox.js',
		'/sw-toolbox.js.map': SW_TOOLBOX_DIR + 'sw-toolbox.js.map',
		'/images/48.png': ICONS_DIR + '48.png',
		'/images/72.png': ICONS_DIR + '72.png',
		'/images/96.png': ICONS_DIR + '96.png',
		'/images/144.png': ICONS_DIR + '144.png',
		'/images/168.png': ICONS_DIR + '168.png',
		'/images/192.png': ICONS_DIR + '192.png'
	}

	private OPTIONS_MAPS: {
		[key: string]: {
			path: string;
			options: {
				app: string;
				status: string;
				playing: boolean;
				offline: boolean;
			}
		}
	} = {
		[INDEX_PATH]: {
			path: INDEX_PATH,
			options: Object.assign(this.lastState, {
				offline: false
			})
		},
		'/base.html': {
			path: INDEX_PATH,
			options: {
				app: '?',
				status: '?',
				playing: false,
				offline: false
			}
		},
		'/offline.html': {
			path: INDEX_PATH,
			options: {
				app: '?',
				status: '?',
				playing: false,
				offline: true
			}
		}
	}

	private isPortAvailable(port: number): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			const server = net.createServer().once('error', (err: NodeError) => {
				if (err.code === 'EADDRINUSE') {
					resolve(false);
				} else {
					resolve(true);
				}
			}).once('listening', () => {
				server.once('close', () => {
					resolve(true);
				});
				server.close();
			}).listen(port);
		});
	}

	private async findUnusedPort(base: number): Promise<number> {
		let currentPort = base;

		while (!await this.isPortAvailable(currentPort)) {
			if (currentPort === 9999) {
				currentPort = 0;
			} else if (currentPort === base - 1) {
				return null;
			} else {
				currentPort++;
			}
		}

		return currentPort;
	}

	private async initServer() {
		this.httpServer = http.createServer(async (req, res) => {
			const url = this.getURL(req);

			if (url.startsWith('/api/')) {
				this.handleAPIRequest(url, res);
			} else {
				this.handleFileRequest(url, res);
			}
		});

		const port = await this.findUnusedPort(REMOTE_PORT);
		if (port !== null) {
			this.httpServer.listen(port, async () => {
				if (port !== REMOTE_PORT) {
					toast(`Hosting server on ${await this.getIp()}:${port} instead`)
					log(`Hosting server on ${await this.getIp()}:${port} instead`)
				} else {
					log(`HTTP server listening on ${await this.getIp()}:${port}`)
				}
			});

			this.wsHandler = new WSHandler(this.httpServer);		
		} else {
			error('No valid port could be found, not hosting');
			this.wsHandler = new WSHandler(null);
		}
	}

	constructor(public refs: {
		activeWindow: Electron.BrowserWindow;
		tray: Electron.Tray;
		DEBUG: boolean;
	}, public launch: (focus?: boolean) => boolean) {
		this.initServer();
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
	
	private respondError(res: http.ServerResponse, url: string, statusCode: keyof typeof STATUS_CODES) {
		if (LOG_ERROR_REQUESTS) {
			console.log(`👎 - [${statusCode}] - ${url}`)
		}
		res.writeHead(~~statusCode, STATUS_CODES[statusCode]);
		res.end();
	}

	private getFileType(file: string): string {
		return file.split('.').reverse()[0];
	}

	private getJadeOptionsForFile(fileName: string): {
		path: string;
		options: {
			[key: string]: any;
		}
	} {
		if (fileName in this.OPTIONS_MAPS) {
			const OPTIONS_MAPS = this.OPTIONS_MAPS;
			return this.OPTIONS_MAPS[fileName as keyof typeof OPTIONS_MAPS];
		}
		return {
			path: fileName,
			options: {}
		};
	}

	private getRelativeFile(fileName: string): string {
		return path.join(__dirname, 'client/', fileName)
	}

	private getFileInfo(fileName: string): Promise<{
		exists: boolean;
		isDir: boolean;
	}> {
		return new Promise((resolve) => {
			fs.stat(fileName, (err, stats) => {
				if (err) {
					resolve({
						exists: false,
						isDir: false
					});
				} else {
					if (stats.isFile()) {
						resolve({
							exists: true, 
							isDir: false
						});
					} else {
						resolve({
							exists: true, 
							isDir: true
						});
					}
				}
			});
		});
	}

	private async renderJade(fileName: string, res: http.ServerResponse): Promise<string> {
		const { path, options } = this.getJadeOptionsForFile(fileName);
		const relativePath = this.getRelativeFile(path);
		const fileInfo = await this.getFileInfo(relativePath);
		if (!fileInfo.exists) {
			this.respondError(res, fileName, '404');
			return null;
		} else if (fileInfo.isDir) {
			this.respondError(res, fileName, '403');
			return null;
		}
		try {
			return jade.compileFile(relativePath)(options);
		} catch(e) {
			console.log('Jade error', e);
			this.respondError(res, fileName, '500');
			return null;
		}
	}

	private readFile(fileName: string, res: http.ServerResponse, utf8: true): Promise<string>;
	private readFile(fileName: string, res: http.ServerResponse): Promise<Buffer>;
	private readFile(fileName: string, res: http.ServerResponse, utf8?: boolean): Promise<string|Buffer> {
		return new Promise<string|Buffer>((resolve, reject) => {
			fs.readFile(this.getRelativeFile(fileName), (err, data) => {
				if (err) {
					reject(err);
				} else {			
					resolve(utf8 ? data.toString() : data);
				}
			});
		});
	}

	private async awaitPromise<T>(promise: Promise<T>, onReject: (err: Error) => void): Promise<T> {
		return new Promise<T>((resolve) => {
			promise.then((result) => {
				resolve(result);
			}, (err) => {
				onReject(err);
				resolve(null);
			});
		});
	}

	private async renderData(fileName: string, res: http.ServerResponse): Promise<Buffer|string> {
		const fileType = this.getFileType(fileName);
		switch (fileType) {
			case 'jade':
			case 'html':
				return await this.renderJade(fileName, res);
		}
		return await this.awaitPromise(this.readFile(fileName, res), async () => {
			const fileInfo = await this.getFileInfo(fileName);
			if (!fileInfo.exists) {
				this.respondError(res, fileName, '404');
			} else if (fileInfo.isDir) {
				this.respondError(res, fileName, '403');
			} else {
				this.respondError(res, fileName, '500');
			}
		});
	}
	
	private async serveFile(url: string, res: http.ServerResponse) {
		const data = await this.renderData(url, res);
		if (data !== null) {
			if (LOG_REQUESTS) {
				console.log(`👌 - [200] - ${url}`);
			}
			res.write(data);
			res.end();
		}
	}
	
	private async handleFileRequest(url: string, res: http.ServerResponse) {
		this.serveFile(url, res);
	}
	
	private sendCommand(command: keyof MessageReasons | EXTERNAL_EVENT | ARG_EVENT, data?: string) {
		//Launch the app if it isn't running yet
		const didLaunch = this.launch(false);
		if (didLaunch) {
			return;
		}
		
		this.refs.activeWindow && Helpers.sendIPCMessage('fromBgPage', {
			cmd: command,
			type: 'event',
			data: data
		}, this.refs.activeWindow.webContents);
	}
	
	private async handleAPIRequest(url: string, res: http.ServerResponse) {
		const command = url.split('/api/').slice(1).join('/api/') as EXTERNAL_EVENT;
		const partialCommand = command.split('/')[0] as EXTERNAL_EVENT;
	
		if (EXTERNAL_EVENTS.indexOf(command) > -1) {
			this.sendCommand(command);
			if (LOG_REQUESTS) {
				console.log(`👌 - [200] - ${url}`);
			}
			res.write(JSON.stringify({
				success: true
			}));
			res.end();
		} else if (ARG_EVENTS.indexOf(partialCommand as ARG_EVENT) > -1) {
			this.sendCommand(partialCommand, decodeURIComponent(command.split('/').slice(1).join('/')));
		} else {
			this.respondError(res, url, '500');
		}
	}
	
	private getURL(req: http.IncomingMessage): string {
		const url = urlLib.parse(req.url).pathname;
		const pathMaps = this.PATH_MAPS;
		if (url in this.PATH_MAPS) {
			return this.PATH_MAPS[url as keyof typeof pathMaps];
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