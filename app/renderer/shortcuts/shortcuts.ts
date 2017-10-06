import { Helpers } from '../../window/libs/helpers';
import { globalShortcut, app } from 'electron'
import { log } from '../log/log'

export namespace Shortcuts {
	const remote: {
		activeWindow: Electron.BrowserWindow;
		tray: Electron.Tray;
		DEBUG: boolean;
		launch(focus?: boolean): void;
	} = {
		activeWindow: null,
		tray: null,
		DEBUG: null,
		launch: null
	}

	function handleEvent(event: keyof MessageReasons) {
		if (remote.launch()) {
			return true;
		}

		switch (event) {
			case 'focus':
				app.focus();
				
				//App has already been launched before otherwise
				//it wouldn't get to this point
				//so just use this as a shortcut to focus
				remote.launch(true);
				break;
		}

		return false;
	}

	function sendMessage(data: keyof MessageReasons) {
		remote.activeWindow && Helpers.sendIPCMessage('fromBgPage', {
			cmd: data,
			type: 'event'
		}, remote.activeWindow.webContents);
	}

	export async function init(refs: {
		activeWindow: Electron.BrowserWindow;
		tray: Electron.Tray;
		DEBUG: boolean;
	}, launch: () => void, bindings: {
		[key in keyof KeyCommands]: (keys[keyof keys][]|keys[keyof keys])[]
	}) {
		const {activeWindow, DEBUG, tray } = refs;
		remote.activeWindow = activeWindow;
		remote.launch = launch;
		remote.DEBUG = DEBUG;
		remote.tray = tray;

		for (let command in bindings) {
			const keys = bindings[command as keyof typeof bindings];
			for (let key of keys) {
				const keyCommand = Array.isArray(key) ? key.join('+') : key;

				globalShortcut.register(keyCommand as any, () => {
					log(`Key ${keyCommand} was pressed, launching command ${command}`);
					if (handleEvent(command as keyof KeyCommands)) {
						log(`Key ${keyCommand} was ignored because it launched the app`);
						return;
					}
					sendMessage(command as keyof KeyCommands);
				});
			}
		}
	}

	export function changeKey(command: keyof MessageReasons, oldKey: any[], newKey: string) {
		globalShortcut.unregister(oldKey.join('+'));
		globalShortcut.register(newKey, () => {
			log(`Key ${newKey} was pressed, launching command ${command}`);
			if (handleEvent(command)) {
				return;
			}
			sendMessage(command);
		});
	}
}

export type ShortcutsType = typeof Shortcuts;