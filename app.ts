import {
	app, BrowserWindow, ipcMain
} from 'electron';
import * as path from 'path';
import * as url from 'url';
import { MessageReasons, PassedAlongMessages } from './window/main'

///<reference path="window/main.ts"/>

let activeWindow: Electron.BrowserWindow = null;

(() => {
	function createWindow () {
		activeWindow = new BrowserWindow({
			width: 1024,
			height: 740,
			icon: path.join(__dirname, 'icons/128.png'),
			frame: false,
			titleBarStyle: 'hidden',
			title: 'Media App',
			webPreferences: {
				nodeIntegration: true
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
	app.on('activate', () => {
		if (activeWindow === null) {
			createWindow();
		}
	});

	function respondToMessage<T extends keyof MessageReasons>(identifier: string, response: MessageReasons[T]) {
		activeWindow && activeWindow.webContents.send('fromBgPage', {
			identifier: identifier,
			data: response
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