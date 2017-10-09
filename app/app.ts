///<reference path="window/main.ts"/>
import {
	app, BrowserWindow, dialog, Tray, Menu
} from 'electron';
import url = require('url');
import path = require('path');
import AutoLaunch = require('auto-launch');
import { Updater } from './renderer/updater/updater'
import { Settings } from './renderer/settings/settings';
import { RemoteServer }  from './renderer/remote/remote';
import { Shortcuts } from './renderer/shortcuts/shortcuts';
import { AdBlocking } from './renderer/adblocking/adblocking';
import { MessageServer, AppMessageServer } from './renderer/msg/msg';
const logger = require('logger').createLogger(path.join(app.getPath('appData'), 'media-app', 'log.log'));

export namespace MediaApp {
	let resolveBrowserWindow: (win: Electron.BrowserWindow) => void = null;

	export namespace Refs {
		export let tray: Electron.Tray = null;
		export let messageServer: MessageServer = null;
		export let idGenerator: AppMessageServer = null;
		export let activeWindow: Electron.BrowserWindow = null;
		export let activeWindowPromise: Promise<Electron.BrowserWindow> = new Promise((resolve) => {
			resolveBrowserWindow = resolve;
		});
		export const DEBUG = !!process.argv.filter(arg => arg.indexOf('--debug-brk=') > -1).length;		
	}

	function initBrowserWindowListeners() {
		const eventChannel = Refs.messageServer.channel('events');

		Refs.activeWindow.addListener('enter-full-screen', () => {
			eventChannel.send('onFullscreened', void 0);
		});
		Refs.activeWindow.addListener('maximize', () => {
			eventChannel.send('onMaximized', void 0);
		});
		Refs.activeWindow.addListener('minimize', () => {
			eventChannel.send('onMinimized', void 0);
		});
		Refs.activeWindow.addListener('restore', () => {
			eventChannel.send('onRestored', void 0);
		});
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
		resolveBrowserWindow(Refs.activeWindow);

		Refs.activeWindow.loadURL(url.format({
			pathname: path.join(__dirname, 'window/main.html'),
			protocol: 'file:',
			slashes: true,
			hash: Refs.DEBUG ? 'DEBUG' : ''
		}));

		Refs.activeWindow.on('closed', () => {
			Refs.activeWindow = null;
			Refs.activeWindowPromise = new Promise((resolve) => {
				resolveBrowserWindow = resolve;
			});
		});

		if (Refs.DEBUG) {
			Refs.activeWindow.webContents.openDevTools();
		}

		initBrowserWindowListeners();

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
					label: 'Launch', 
					type: 'normal',
					accelerator: 'Shift+Alt+L',
					click: () => {
						launch(true);
					}
				}, { 
					label: 'separator', 
					type: 'separator' 
				}, { 
					label: 'Launch on startup', 
					type: 'checkbox', 
					checked: Refs.DEBUG ? false : await Settings.get('launchOnBoot'),
					click: async () => {
						if (!Refs.DEBUG) {
							const wasEnabled = await Settings.get('launchOnBoot');
							Settings.set('launchOnBoot', !wasEnabled);

							contextMenu.items[2].checked = !wasEnabled;
							tray.setContextMenu(contextMenu);
						}
					}
				}, { 
					label: 'Auto-update', 
					type: 'checkbox', 
					checked: await Settings.get('autoUpdate'),
					click: async () => {
						const wasEnabled = await Settings.get('autoUpdate');
						Settings.set('launchOnBoot', !wasEnabled);

						contextMenu.items[2].checked = !wasEnabled;
						tray.setContextMenu(contextMenu);
					}
				}, {
					label: 'Check for updates', 
					type: 'normal',
					click: async () => {
						Updater.checkForUpdates();
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
				let widevineExists = false;
				try {
					widevineExists = widevine.load(app, widevinePath);
				} catch(e) {
					logger.error('Error loading widevine', e);
				}

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

		namespace Comm {
			export function setupListeners() {
				const settingsChannel = Refs.messageServer.channel('settings');
				const toBgPageChannel = Refs.messageServer.channel('toBgPage');
				const evalChannel = Refs.messageServer.channel('eval');

				toBgPageChannel.on('openDevTools', () => {
					Refs.activeWindow.webContents.openDevTools();
				});
				toBgPageChannel.on('messageServer', (data) => {
					activeServer.sendMessage(data);
				});
				toBgPageChannel.on('isMinimized', () => {
					return Refs.activeWindow && Refs.activeWindow.isMinimized();
				});
				toBgPageChannel.on('isMaximized', () => {
					return Refs.activeWindow && Refs.activeWindow.isMaximized();
				});
				toBgPageChannel.on('isFullscreen', () => {
					return Refs.activeWindow && Refs.activeWindow.isFullScreen();
				});
				toBgPageChannel.on('restore', () => {
					Refs.activeWindow && Refs.activeWindow.restore();
				});
				toBgPageChannel.on('enterFullscreen', () => {
					Refs.activeWindow && Refs.activeWindow.setFullScreen(true);
				});
				toBgPageChannel.on('exitFullscreen', () => {
					Refs.activeWindow && Refs.activeWindow.setFullScreen(false);
				});
				toBgPageChannel.on('minimize', () => {
					Refs.activeWindow && Refs.activeWindow.minimize();
				});
				toBgPageChannel.on('maximize', () => {
					Refs.activeWindow && Refs.activeWindow.maximize();
				});
				toBgPageChannel.on('close', () => {
					Refs.activeWindow && Refs.activeWindow.close();
				});
				toBgPageChannel.on('quit', () => {
					app.quit();
				});
				toBgPageChannel.on('updatePlayStatus', (data) => {
					activeServer.sendMessage({
						type: 'playUpdate',
						data: {
							playing: data === 'play'
						}
					})
				});

				evalChannel.on('eval', (data) => {
					eval(data);
				});

				settingsChannel.on('getSetting', (async (key: keyof Settings.Settings) => {
					return await Settings.get(key);
				}) as any);
				settingsChannel.on('setSetting', async (data) => {
					const { key, val } = data;
					await Settings.set(key, val);
				});
			}
		}

		export async function init() {
			//Context Menu
			require('electron-context-menu')({});

			Refs.idGenerator = new AppMessageServer(Refs);
			Refs.messageServer = new MessageServer(Refs);
			Comm.setupListeners();
			AdBlocking.blockAds();
			Updater.init(Refs, Settings);
			activeServer = new RemoteServer(Refs, launch);
			Shortcuts.init(Refs, launch, Settings);
			await WideVine.load();
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

			Settings.listen('autoUpdate', (enabled) => {
				set(enabled);
			});
		}

		function set(enabled: boolean) {
			if (enabled) {
				autoLauncher.enable();
			} else {
				autoLauncher.disable();
			}
		}
	}

	export async function init() {
		app.on('ready', async () => {
			await Settings.init();
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