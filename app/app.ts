import {
	app, BrowserWindow
} from 'electron';
import * as path from 'path';
import * as url from 'url';

///<reference path="window/main.ts"/>

let activeWindow: Electron.BrowserWindow = null;

type Maybe<T> = T|void;

function inlineFn<T extends {
	[key: string]: any;
}>(fn: (REPLACE: T) => any|void, args?: T,
	...insertedFunctions: Array<Function>): string {
		args = args || {} as T;
		let str = `${insertedFunctions.map(inserted => inserted.toString()).join('\n')}
			try { return (${fn.toString()})(arguments) } catch(err) { throw new Error(err.name + '-' + err.stack); }`;
		Object.getOwnPropertyNames(args).forEach((key) => {
			let arg = args[key];
			if (typeof arg === 'object' || typeof arg === 'function') {
				arg = JSON.stringify(arg);
			}

			if (typeof arg === 'string' && arg.split('\n').length > 1) {
				str = str.replace(new RegExp(`REPLACE\.${key}`, 'g'), 
					`' + ${JSON.stringify(arg.split('\n'))}.join('\\n') + '`);
			} else {
				str = str.replace(new RegExp(`REPLACE\.${key}`, 'g'), arg !== undefined &&
					arg !== null && typeof arg === 'string' ?
						arg.replace(/\\\"/g, `\\\\\"`) : arg);
			}
		});
		return str;
	}

function executeJS(view: Maybe<Electron.BrowserWindow>, js: string) {
	if (view) {
		view.webContents.executeJavaScript(js);
	}
}

(() => {
	function createWindow () {
		activeWindow = new BrowserWindow({
			width: 1024,
			height: 740,
			icon: path.join(__dirname, 'icons/128.png'),
			frame: false,
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
	console.log('lol');
	debugger;

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
})();