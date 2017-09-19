///<reference path="window/main.ts"/>
import {
	app, BrowserWindow, ipcMain, dialog, Tray, Menu
} from 'electron';
import fs = require('fs');
import url = require('url');
import path = require('path');
import AutoLaunch = require('auto-launch');
import { handleUpdates } from './appLibs/updater/updater'
import { RemoteServer }  from './appLibs/remote/remote';
import { AdBlocking } from './appLibs/adblocking/adblocking';
import { Shortcuts } from './appLibs/shortcuts/shortcuts';
import { MessageReasons, PassedAlongMessages } from './window/appWindow';

namespace MusicApp {
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
					label: 'toggleAutoBoot', 
					type: 'checkbox', 
					checked: await Settings.get('launchOnBoot'),
					click: async () => {
						const wasEnabled = await Settings.get('launchOnBoot');
						AutoLauncher.set(!wasEnabled);
						Settings.set('launchOnBoot', !wasEnabled);

						contextMenu.items[2].checked = !wasEnabled;
						tray.setContextMenu(contextMenu);
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
				Refs.activeWindow && 
				Refs.activeWindow.webContents.send('fromBgPage', {
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
						Refs.activeWindow.webContents.openDevTools();
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
								Refs.activeWindow && 
								Refs.activeWindow.isMinimized());
							break;
						case 'onFullscreened':
							Refs.activeWindow && 
							Refs.activeWindow.addListener('enter-full-screen', () => {
								respondToMessage(identifier, null);
							});
							break;
						case 'onMaximized':
							Refs.activeWindow && 
							Refs.activeWindow.addListener('maximize', () => {
								respondToMessage(identifier, null);
							});
							break;
						case 'onMinimized':
							Refs.activeWindow && 
							Refs.activeWindow.addListener('minimize', () => {
								respondToMessage(identifier, null);
							});
							break;
						case 'onRestored':
							Refs.activeWindow && 
							Refs.activeWindow.addListener('restore', () => {
								respondToMessage(identifier, null);
							});
							break;
						case 'isMaximized':
							respondToMessage(identifier,
								Refs.activeWindow && 
								Refs.activeWindow.isMaximized());
							break;
						case 'isFullscreen':
							respondToMessage(identifier,
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
							app.quit();
							break;
						case 'quit':
							app.quit();
							break;
						case 'passAlong':
							Refs.activeWindow && 
							Refs.activeWindow.webContents.send('passedAlong', data);
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
			activeServer = new RemoteServer(Refs);
			Shortcuts.init(Refs, launch);
			await WideVine.load();
		}
	}

	namespace Settings {
		let loaded: boolean = false;
		let loadingPromise: Promise<void> = null;
		const settingsPath = path.join(app.getPath('appData'), 'settings.json');
		let settings: Settings = null;

		const settingTypes: {
			[P in keyof Settings.Settings]: "string" | "number" | "boolean" | "symbol" | "undefined" | "object" | "function";
		} = {
			launchOnBoot: 'boolean'
		}

		export interface Settings {
			launchOnBoot: boolean;
		}

		const defaultSettings: Settings.Settings = {
			launchOnBoot: true
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
			loadingPromise = new Promise((resolve) => {
				fs.stat(settingsPath, async (err, stats) => {
					if (err) {
						//Doesn't exist, make it
						await uploadSettings(defaultSettings);
						settings = JSON.parse(JSON.stringify(defaultSettings));
					} else {
						settings = await readSettings();
					}
					resolve();
				});
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

	namespace AutoLauncher {
		let autoLauncher: AutoLaunch = null;

		export async function init() {
			autoLauncher = new AutoLaunch({
				name: 'MediaApp'
			});

			const shouldBeEnabled = await Settings.get('launchOnBoot');
			const isEnabled = await autoLauncher.isEnabled();
			if (shouldBeEnabled !== isEnabled) {
				if (shouldBeEnabled) {
					await autoLauncher.enable();
				} else {
					await autoLauncher.disable();
				}
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
			await Setup.init();
			Settings.init();
			await AutoLauncher.init();
			SystemTray.init();

			if (!(await Settings.get('launchOnBoot'))) {
				//Not launch on boot, that means that this launch should start the app
				launch(true);
			}

			app.on('window-all-closed', async () => {
				if (!(await Settings.get('launchOnBoot'))) {
					//Not launch on boot, so close when done
					app.quit();
				}
			});
		});
	}
}

MusicApp.init();