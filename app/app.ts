///<reference path="window/main.ts"/>
import { MessageServer, AppMessageServer } from './backgroundLibs/msg/msg';
import { AdBlocking } from './backgroundLibs/adblocking/adblocking';
import { Shortcuts } from './backgroundLibs/shortcuts/shortcuts';
import { RemoteServer }  from './backgroundLibs/remote/remote';
import { Settings } from './backgroundLibs/settings/settings';
import { Updater } from './backgroundLibs/updater/updater';
import { app, BrowserWindow, Tray, Menu } from 'electron';
import { log, error } from './backgroundLibs/log/log';
import AutoLaunch = require('auto-launch');
import path = require('path');
import url = require('url');

app.commandLine.appendSwitch('widevine-cdm-path', path.join(__dirname, 'widevine', 'widevinecdmadapter.dll'));
app.commandLine.appendSwitch('widevine-cdm-version', '1.4.8.984');

const appData = app.getPath('appData');
const logger = require('logger').createLogger(path.join(appData, 'media-app', 'log.log'));

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
		export const DEBUG = !!process.argv.filter(arg => arg.indexOf('debugging') > -1).length;		
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
					});
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

			log('Generating ID generator server');
			Refs.idGenerator = new AppMessageServer(Refs);
			log('Starting message server');
			Refs.messageServer = new MessageServer(Refs);
			log('Setting up listeners');
			Comm.setupListeners();
			log('Setting up adblocker');
			AdBlocking.blockAds(Settings, appData);
			log('Initializing updater');
			Updater.init(Refs, Settings);
			log('Starting remote server');
			activeServer = new RemoteServer(Refs, launch);
			log('Initializing shortcuts');
			Shortcuts.init(Refs, launch, Settings);
			log('Done with initialization');
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
		log('Waiting for app to be ready');
		app.once('ready', async () => {
			log('App is ready, waiting for settings to initialize');
			await Settings.init();
			log('Settings initialized');
			await Setup.init();
			log('Done setupping, initializing autolauncher');
			await AutoLauncher.init();
			log('Initializing tray icon');
			SystemTray.init();
			log('Done initializing everything');

			if (Refs.DEBUG || !(await Settings.get('launchOnBoot'))) {
				//Not launch on boot, that means that this launch should start the app
				log('Launching main window');
				launch(true);
			} else {
				log('Not launching main window');
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
	log('Initializing');
	MediaApp.init();
} catch(e) {
	error('An error occurred while launching', e);
	logger.error(e);
}