import {
	app, BrowserWindow, ipcMain, globalShortcut, dialog
} from 'electron';
import * as path from 'path';
import * as url from 'url';
import { MessageReasons, PassedAlongMessages } from './window/main'
const widevine: {
	load(app: Electron.App, dest: string): boolean;
	downloadAsync(app: Electron.App, dest: string): Promise<void>;
} = require('electron-widevinecdm')

///<reference path="window/main.ts"/>

require('electron-context-menu')({});

const widevinePath = path.join(app.getPath('appData'), 'widevine');
const widevineExists = widevine.load(app, widevinePath);

let activeWindow: Electron.BrowserWindow = null;

type keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 
	'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
	'W', 'X', 'Y', 'Z', 'Shift', 'Alt', 'Left', 'Right', 'Down',
	'Up', 'MediaNextTrack', 'MediaPreviousTrack', 'MediaStop',
	'MediaPlayPause', 'Space', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const map = new Map<
	Array<keys[keyof keys]|Array<keys[keyof keys]|Array<keys[keyof keys]>>>,
	keyof MessageReasons>([
		[[['Shift', 'Alt', 'F']], 'focus'],
		[[['Shift', 'Alt', 'Left']], 'lowerVolume'],
		[[['Shift', 'Alt', 'Right']], 'raiseVolume'],
		[[['Shift', 'Alt', 'Down'], 'MediaPlayPause'], 'pausePlay'],
		[[['Shift', 'Alt', 'Up'], 'MediaNextTrack'], 'magicButton'],

		[['MediaStop'], 'pause'],
		[['MediaPlayPause'], 'pausePlay'],
	]);

(() => {
	function registerShortcuts() {
		for (let [keys, command] of map.entries()) {
			for (let key of keys) {
				const keyCommand = Array.isArray(key) ? key.join('+') : key;

				globalShortcut.register(keyCommand as any, () => {
					sendMessage(command);
				});
			}
		}
	}

	async function loadWidevine() {
		return new Promise(async (resolve) => {
			if (widevineExists) {
				resolve();
			} else {
				await widevine.downloadAsync(app, widevinePath);
				app.relaunch();
				dialog.showMessageBox({
					message: 'You need to relaunch the app to use widevineCDM',
					buttons: [
						'Relaunch now',
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

	async function createWindow () {
		await loadWidevine();

		registerShortcuts();

		activeWindow = new BrowserWindow({
			width: 1024,
			height: 740,
			icon: path.join(__dirname, 'icons/48.png'),
			frame: false,
			titleBarStyle: 'hidden',
			title: 'Media App',
			webPreferences: {
				nodeIntegration: true,
				plugins: true
			}
		});

		activeWindow.loadURL(url.format({
			pathname: path.join(__dirname, 'window/main.html'),
			protocol: 'file:',
			slashes: true
		}));

		activeWindow.on('closed', () => {
			activeWindow = null;
		});

		activeWindow.webContents.openDevTools();
	}

	app.on('ready', createWindow);
	app.on('window-all-closed', () => {
		if (process.platform !== 'darwin') {
			app.quit();
		}
	});

	function respondToMessage<T extends keyof MessageReasons>(identifier: string, response: MessageReasons[T]) {
		activeWindow && activeWindow.webContents.send('fromBgPage', {
			identifier: identifier,
			data: response,
			type: 'response'
		});
	}

	function sendMessage(data: keyof MessageReasons) {
		activeWindow && activeWindow.webContents.send('fromBgPage', {
			cmd: data,
			type: 'event'
		});
	}

	ipcMain.on('toBgPage', (event: Event, msg: {
		identifier: string;
		type: keyof MessageReasons | 'passAlong',
		respond: boolean;
		data?: {
			type: keyof PassedAlongMessages;
		} & PassedAlongMessages[keyof PassedAlongMessages]
	}) => {
		const { identifier, type, data } = msg;
		switch (type) {
			case 'isMinimized':
				respondToMessage(identifier, activeWindow && activeWindow.isMinimized());
				break;
			case 'onFullscreened':
				activeWindow && activeWindow.addListener('enter-full-screen', () => {
					respondToMessage(identifier, null);
				});
				break;
			case 'onMaximized':
				activeWindow && activeWindow.addListener('maximize', () => {
					respondToMessage(identifier, null);
				});
				break;
			case 'onMinimized':
				activeWindow && activeWindow.addListener('minimize', () => {
					respondToMessage(identifier, null);
				});
				break;
			case 'onRestored':
				activeWindow && activeWindow.addListener('restore', () => {
					respondToMessage(identifier, null);
				});
				break;
			case 'isMaximized':
				respondToMessage(identifier, activeWindow && activeWindow.isMaximized());
				break;
			case 'isFullscreen':
				respondToMessage(identifier, activeWindow && activeWindow.isFullScreen());
				break;
			case 'restore':
				activeWindow && activeWindow.restore();
				break;
			case 'enterFullscreen':
				activeWindow && activeWindow.setFullScreen(true);
				break;
			case 'exitFullscreen':
				activeWindow && activeWindow.setFullScreen(false);
				break;
			case 'minimize':
				activeWindow && activeWindow.minimize();
				break;
			case 'maximize':
				activeWindow && activeWindow.maximize();
				break;
			case 'close':
				activeWindow && activeWindow.close();
				app.quit();
				break;
			case 'passAlong':
				activeWindow && activeWindow.webContents.send('passedAlong', data);
				break;
		}
	});
})();