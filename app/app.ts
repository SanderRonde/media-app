///<reference path="window/main.ts"/>
import {
	app, BrowserWindow, ipcMain, dialog, Tray, Menu
} from 'electron';
import fs = require('fs');
import url = require('url');
import path = require('path');
const logger = require('logger').createLogger(path.join(app.getPath('appData'), 'media-app', 'log.log'));
import AutoLaunch = require('auto-launch');
import { Helpers} from './window/libs/helpers';
import { RemoteServer }  from './renderer/remote/remote';
import { Updater } from './renderer/updater/updater'
import { Shortcuts } from './renderer/shortcuts/shortcuts';
import { AdBlocking } from './renderer/adblocking/adblocking';

export namespace MediaApp {
	namespace Refs {
		export let activeWindow: Electron.BrowserWindow = null;
		export let tray: Electron.Tray = null;
		export const DEBUG = !!process.argv.filter(arg => arg.indexOf('--debug-brk=') > -1).length;		
	}

	function launch(focus: boolean = false) {		
		if (Refs.activeWindow) {
			focus && Refs.activeWindow.show();
			return false;
		}

		Refs.activeWindow = new BrowserWindow({
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

		Refs.activeWindow.loadURL(url.format({
			pathname: path.join(__dirname, 'window/main.html'),
			protocol: 'file:',
			slashes: true,
			hash: Refs.DEBUG ? 'DEBUG' : ''
		}));

		Refs.activeWindow.on('closed', () => {
			Refs.activeWindow = null;
		});

		if (Refs.DEBUG) {
			Refs.activeWindow.webContents.openDevTools();
		}

		return true;
	}

	namespace SystemTray {
		export async function init() {
			if (Refs.DEBUG) {
				return;
			}

			let imageLocation = path.join(__dirname, 'icons/32.png');
			if (process.platform === 'win32') {
				imageLocation = path.join(__dirname, 'icons/icon.ico');
			}

			const tray = Refs.tray = new Tray(imageLocation);
			const contextMenu = Menu.buildFromTemplate([
				{ 
					label: 'launch', 
					type: 'normal',
					accelerator: 'Shift+Alt+L',
					click: () => {
						launch(true);
					}
				}, { 
					label: 'separator', 
					type: 'separator' 
				}, { 
					label: 'launch on startup', 
					type: 'checkbox', 
					checked: Refs.DEBUG ? false : await Settings.get('launchOnBoot'),
					click: async () => {
						if (!Refs.DEBUG) {
							const wasEnabled = await Settings.get('launchOnBoot');
							AutoLauncher.set(!wasEnabled);
							Settings.set('launchOnBoot', !wasEnabled);

							contextMenu.items[2].checked = !wasEnabled;
							tray.setContextMenu(contextMenu);
						}
					}
				}, { 
					label: 'separator', 
					type: 'separator' 
				}, { 
					label: 'quit', 
					type: 'normal',
					click: () => {
						Refs.activeWindow && Refs.activeWindow.destroy();
						app.quit();
					}
				}
			]);

			tray.setTitle('Media App');
			tray.setToolTip('Media App');
			tray.setContextMenu(contextMenu);

			tray.on('click', () => {
				launch(true);
			});
		}
	}

	export namespace Setup {
		export let activeServer: RemoteServer = null;	

		namespace WideVine {
			export async function load() {
				const widevine: {
					load(app: Electron.App, dest: string): boolean;
					downloadAsync(app: Electron.App, dest: string): Promise<void>;
				} = require('electron-widevinecdm');
				const widevinePath = path.join(app.getPath('appData'), 'media-app', 'widevine');
				const widevineExists = widevine.load(app, widevinePath);

				return new Promise(async (resolve) => {
					if (widevineExists) {
						resolve();
					} else {
						await widevine.downloadAsync(app, widevinePath);
						app.relaunch();

						if (!Refs.activeWindow) {
							//No open window, the user probably won't notice a reload
							app.quit();
						} else {
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
					}
				});
			}
		}

		namespace Messaging {
			function respondToMessage<T extends keyof MessageReasons>(identifier: string, response: MessageReasons[T]) {
				Refs.activeWindow && 
				Helpers.sendIPCMessage('fromBgPage', {
					identifier: identifier,
					data: response,
					type: 'response'
				}, Refs.activeWindow.webContents);
			}

			export function setupListeners() {
				ipcMain.on('toBgPage', async (event, msg) => {
					switch (msg.type) {
						case 'openDevTools':
							Refs.activeWindow.webContents.openDevTools();
							break;
						case 'messageServer':
							activeServer.sendMessage(msg.data as {
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
							respondToMessage(msg.identifier, 
								Refs.activeWindow && 
								Refs.activeWindow.isMinimized());
							break;
						case 'onFullscreened':
							Refs.activeWindow && 
							Refs.activeWindow.addListener('enter-full-screen', () => {
								respondToMessage(msg.identifier, null);
							});
							break;
						case 'onMaximized':
							Refs.activeWindow && 
							Refs.activeWindow.addListener('maximize', () => {
								respondToMessage(msg.identifier, null);
							});
							break;
						case 'onMinimized':
							Refs.activeWindow && 
							Refs.activeWindow.addListener('minimize', () => {
								respondToMessage(msg.identifier, null);
							});
							break;
						case 'onRestored':
							Refs.activeWindow && 
							Refs.activeWindow.addListener('restore', () => {
								respondToMessage(msg.identifier, null);
							});
							break;
						case 'isMaximized':
							respondToMessage(msg.identifier,
								Refs.activeWindow && 
								Refs.activeWindow.isMaximized());
							break;
						case 'isFullscreen':
							respondToMessage(msg.identifier,
								Refs.activeWindow && 
								Refs.activeWindow.isFullScreen());
							break;
						case 'restore':
							Refs.activeWindow && 
							Refs.activeWindow.restore();
							break;
						case 'enterFullscreen':
							Refs.activeWindow && 
							Refs.activeWindow.setFullScreen(true);
							break;
						case 'exitFullscreen':
							Refs.activeWindow && 
							Refs.activeWindow.setFullScreen(false);
							break;
						case 'minimize':
							Refs.activeWindow && 
							Refs.activeWindow.minimize();
							break;
						case 'maximize':
							Refs.activeWindow && 
							Refs.activeWindow.maximize();
							break;
						case 'close':
							Refs.activeWindow && 
							Refs.activeWindow.close();
							break;
						case 'quit':
							app.quit();
							break;
						case 'passAlong':
							Refs.activeWindow && 
							Helpers.sendIPCMessage('passedAlong', msg.data, Refs.activeWindow.webContents);
							break;
						case 'playStatus':
							const isPlaying = msg.data === 'play';
							activeServer.sendMessage({
								type: 'playUpdate',
								data: {
									playing: isPlaying
								}
							})
							break;
						case 'getKeyBindings':
							respondToMessage(msg.identifier, 
								await Settings.get('keys'));
							break;
						case 'setKeyBinding':
							const oldBindings = await Settings.get('keys');
							const { command, shortcut } = msg.data as {
								command: keyof KeyCommands;
								shortcut: string;
							};
							const oldShortcut = oldBindings[command];

							oldBindings[command] = shortcut.split('+') as any;
							Settings.set('keys', oldBindings);

							Shortcuts.changeKey(command, oldShortcut, shortcut);
							break;
					}
				});
				ipcMain.on('eval', (event, msg) => {
					eval(msg);
				});
			}
		}

		export async function init() {
			//Context Menu
			require('electron-context-menu')({});

			Messaging.setupListeners();
			AdBlocking.blockAds();
			Updater.init(Refs);
			activeServer = new RemoteServer(Refs, launch);
			Shortcuts.init(Refs, launch, await Settings.get('keys'));
			await WideVine.load();
		}
	}

	export namespace Settings {
		let loaded: boolean = false;
		let loadingResolve: () => void = null;
		const loadingPromise = new Promise<void>((resolve) => {
			loadingResolve = resolve;
		});

		const settingsPath = path.join(app.getPath('appData'), 'media-app', 'settings.json');
		let settings: Settings = null;

		const settingTypes: {
			[P in keyof Settings.Settings]: "string" | "number" | "boolean" | "symbol" | "undefined" | "object" | "function";
		} = {
			launchOnBoot: 'boolean',
			keys: 'object'
		}

		export interface Settings {
			launchOnBoot: boolean;
			keys: {
				[key in keyof KeyCommands]: (keys[keyof keys][]|keys[keyof keys])[]
			}
		}

		const defaultSettings: Settings.Settings = {
			launchOnBoot: true,
			keys: {
				focus: [['Shift', 'Alt', 'F']],
				lowerVolume: [['Shift', 'Alt', 'Left']],
				raiseVolume: [['Shift', 'Alt', 'Right']],
				pausePlay: [['Shift', 'Alt', 'Down'], 'MediaPlayPause'],
				magicButton:  [['Shift', 'Alt', 'Up'], 'MediaNextTrack'],
				launch: [['Shift', 'Alt', 'L']],
				pause: ['MediaStop']
			}
		}

		async function assertLoaded(): Promise<void> {
			if (loaded) {
				return null;
			} else {
				return await loadingPromise;
			}
		}

		function uploadSettings(settings: Settings.Settings): Promise<boolean> {
			return new Promise<boolean>((resolve) => {
				fs.writeFile(settingsPath, JSON.stringify(settings), (err) => {
					if (err) {
						resolve(false);
					} else {
						resolve(true);
					}
				});
			});
		}

		function readSettings(): Promise<Settings> {
			return new Promise<Settings>((resolve) => {
				fs.readFile(settingsPath, 'utf8', async (err, data) => {
					if (err) {
						//Something went wrong, probably doesn't exist or something, write default
						await uploadSettings(defaultSettings);
						resolve(JSON.parse(JSON.stringify(defaultSettings)));
					} else {
						try {
							resolve(JSON.parse(data));
						} catch(e) {
							//Corrupted, write default
							await uploadSettings(defaultSettings);
							resolve(JSON.parse(JSON.stringify(defaultSettings)));
						}
					}
				});
			});
		}

		export function init() {
			fs.stat(settingsPath, async (err, stats) => {
				if (err) {
					//Doesn't exist, make it
					await uploadSettings(defaultSettings);
					settings = JSON.parse(JSON.stringify(defaultSettings));
				} else {
					settings = await readSettings();
				}
				loadingResolve();
			});
			return loadingPromise;
		}

		async function assertType<K extends keyof Settings.Settings>(key: K, value: any): Promise<Settings.Settings[K]> {
			if (typeof value !== settingTypes[key]) {
				//Set that value back to the default value as some corruption has happened
				settings[key] = JSON.parse(JSON.stringify(defaultSettings))[key];
				await uploadSettings(settings);
				return settings[key];
			}
			return value;
		}

		export async function get<K extends keyof Settings.Settings>(key: K): Promise<Settings.Settings[K]> {
			await assertLoaded();

			return await assertType(key, settings[key]);
		}

		export async function set<K extends keyof Settings.Settings>(key: K, val: Settings.Settings[K]) {
			await assertLoaded();

			settings[key] = val;
			await uploadSettings(settings);
		}
	}

	export namespace AutoLauncher {
		let autoLauncher: AutoLaunch = null;

		export async function init() {
			autoLauncher = new AutoLaunch({
				name: 'MediaApp'
			});

			const shouldBeEnabled = Refs.DEBUG ? false : await Settings.get('launchOnBoot');
			const isEnabled = await autoLauncher.isEnabled();
			if (shouldBeEnabled !== isEnabled) {
				set(shouldBeEnabled);
			}
		}

		export async function set(enabled: boolean): Promise<void> {
			if (enabled) {
				autoLauncher.enable();
			} else {
				autoLauncher.disable();
			}
		}
	}

	export async function init() {
		app.on('ready', async () => {
			Settings.init();
			await Setup.init();
			await AutoLauncher.init();
			SystemTray.init();

			if (Refs.DEBUG || !(await Settings.get('launchOnBoot'))) {
				//Not launch on boot, that means that this launch should start the app
				launch(true);
			}

			app.on('window-all-closed', async () => {
				if (Refs.DEBUG || !(await Settings.get('launchOnBoot'))) {
					//Not launch on boot, so close when done
					app.quit();
				}
			});
		});
	}
}
export type MediaAppType = typeof MediaApp;

try {
	logger.info('initializing');
	MediaApp.init();
} catch(e) {
	logger.error(e);
}