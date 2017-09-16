///<reference path="window/main.ts"/>
import {
	app, BrowserWindow, ipcMain, dialog
} from 'electron';
import * as url from 'url';
import * as path from 'path';
import { handleUpdates } from './appLibs/updater/updater'
import { RemoteServer }  from './appLibs/remote/remote';
import { AdBlocking } from './appLibs/adblocking/adblocking';
import { registerShortcuts } from './appLibs/shortcuts/shortcuts';
import { MessageReasons, PassedAlongMessages } from './window/appWindow';

interface ActiveWindowContainer {
	activeWindow: Electron.BrowserWindow;
}

namespace MusicApp {
	const activeWindowContainer: ActiveWindowContainer = {
		activeWindow: null
	}

	namespace Setup {
		let activeServer: RemoteServer = null;	

		namespace WideVine {
			export async function load() {
				const widevine: {
					load(app: Electron.App, dest: string): boolean;
					downloadAsync(app: Electron.App, dest: string): Promise<void>;
				} = require('electron-widevinecdm')
				const widevinePath = path.join(app.getPath('appData'), 'widevine');
				const widevineExists = widevine.load(app, widevinePath);

				return new Promise(async (resolve) => {
					if (widevineExists) {
						resolve();
					} else {
						await widevine.downloadAsync(app, widevinePath);
						app.relaunch();
						dialog.showMessageBox({
							message: 'You need to relaunch the app to use widevineCDM',
							buttons: [
								'Close now',
								'Cancel',
							],
							defaultId: 0,
							cancelId: 1,
						}, (response) => {
							if (response === 0) {
								app.quit();
							}
						});
					}
				});
			}
		}

		namespace Messaging {
			function respondToMessage<T extends keyof MessageReasons>(identifier: string, response: MessageReasons[T]) {
				activeWindowContainer.activeWindow && 
				activeWindowContainer.activeWindow.webContents.send('fromBgPage', {
					identifier: identifier,
					data: response,
					type: 'response'
				});
			}

			export function setupListeners() {
				ipcMain.on('toBgPage', (event: Event, msg: {
					identifier: string;
					type: keyof MessageReasons | 'passAlong',
					respond: boolean;
					data?: {
						type: keyof PassedAlongMessages;
					} | PassedAlongMessages[keyof PassedAlongMessages] | {
						type: string;
						data: {
							app: string;
							status: string;
						};
					}
				}) => {
					const { identifier, type, data } = msg;
					switch (type) {
						case 'openDevTools':
							activeWindowContainer.activeWindow.webContents.openDevTools();
							break;
						case 'messageServer':
							activeServer.sendMessage(data as {
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
							});
							break;
						case 'isMinimized':
							respondToMessage(identifier, 
								activeWindowContainer.activeWindow && 
								activeWindowContainer.activeWindow.isMinimized());
							break;
						case 'onFullscreened':
							activeWindowContainer.activeWindow && 
							activeWindowContainer.activeWindow.addListener('enter-full-screen', () => {
								respondToMessage(identifier, null);
							});
							break;
						case 'onMaximized':
							activeWindowContainer.activeWindow && 
							activeWindowContainer.activeWindow.addListener('maximize', () => {
								respondToMessage(identifier, null);
							});
							break;
						case 'onMinimized':
							activeWindowContainer.activeWindow && 
							activeWindowContainer.activeWindow.addListener('minimize', () => {
								respondToMessage(identifier, null);
							});
							break;
						case 'onRestored':
							activeWindowContainer.activeWindow && 
							activeWindowContainer.activeWindow.addListener('restore', () => {
								respondToMessage(identifier, null);
							});
							break;
						case 'isMaximized':
							respondToMessage(identifier,
								activeWindowContainer.activeWindow && 
								activeWindowContainer.activeWindow.isMaximized());
							break;
						case 'isFullscreen':
							respondToMessage(identifier,
								activeWindowContainer.activeWindow && 
								activeWindowContainer.activeWindow.isFullScreen());
							break;
						case 'restore':
							activeWindowContainer.activeWindow && 
							activeWindowContainer.activeWindow.restore();
							break;
						case 'enterFullscreen':
							activeWindowContainer.activeWindow && 
							activeWindowContainer.activeWindow.setFullScreen(true);
							break;
						case 'exitFullscreen':
							activeWindowContainer.activeWindow && 
							activeWindowContainer.activeWindow.setFullScreen(false);
							break;
						case 'minimize':
							activeWindowContainer.activeWindow && 
							activeWindowContainer.activeWindow.minimize();
							break;
						case 'maximize':
							activeWindowContainer.activeWindow && 
							activeWindowContainer.activeWindow.maximize();
							break;
						case 'close':
							activeWindowContainer.activeWindow && 
							activeWindowContainer.activeWindow.close();
							app.quit();
							break;
						case 'quit':
							app.quit();
							break;
						case 'passAlong':
							activeWindowContainer.activeWindow && 
							activeWindowContainer.activeWindow.webContents.send('passedAlong', data);
							break;
						case 'playStatus':
							const isPlaying = data === 'play';
							activeServer.sendMessage({
								type: 'playUpdate',
								data: {
									playing: isPlaying
								}
							})
							break;
					}
				});
			}
		}

		export async function init() {
			//Context Menu
			require('electron-context-menu')({});

			Messaging.setupListeners();
			AdBlocking.blockAds();
			handleUpdates();
			activeServer = new RemoteServer(activeWindowContainer);
			registerShortcuts(activeWindowContainer);
			await WideVine.load();
		}
	}

	async function launch () {		
		const DEBUG = !!process.argv.filter(arg => arg.indexOf('--debug-brk=') > -1).length;

		activeWindowContainer.activeWindow = new BrowserWindow({
			width: 1024,
			height: 740,
			icon: path.join(__dirname, 'icons/32.png'),
			frame: false,
			titleBarStyle: 'hidden',
			title: 'Media App',
			webPreferences: {
				nodeIntegration: true,
				plugins: true
			}
		});

		activeWindowContainer.activeWindow.loadURL(url.format({
			pathname: path.join(__dirname, 'window/main.html'),
			protocol: 'file:',
			slashes: true,
			hash: DEBUG ? 'DEBUG' : ''
		}));

		activeWindowContainer.activeWindow.on('closed', () => {
			activeWindowContainer.activeWindow = null;
		});

		if (DEBUG) {
			activeWindowContainer.activeWindow.webContents.openDevTools();
		}
	}

	export async function init() {
		app.on('ready', async () => {
			await Setup.init();
			launch();
		});
	}
}

MusicApp.init();