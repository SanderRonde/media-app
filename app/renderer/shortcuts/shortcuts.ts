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

	type keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 
	'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
	'W', 'X', 'Y', 'Z', 'Shift', 'Alt', 'Left', 'Right', 'Down',
	'Up', 'MediaNextTrack', 'MediaPreviousTrack', 'MediaStop',
	'MediaPlayPause', 'Space', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
	const map = new Map<
		(keys[keyof keys]|(keys[keyof keys]|keys[keyof keys][])[])[],
		keyof MessageReasons>([
			[[['Shift', 'Alt', 'F']], 'focus'],
			[[['Shift', 'Alt', 'Left']], 'lowerVolume'],
			[[['Shift', 'Alt', 'Right']], 'raiseVolume'],
			[[['Shift', 'Alt', 'Down'], 'MediaPlayPause'], 'pausePlay'],
			[[['Shift', 'Alt', 'Up'], 'MediaNextTrack'], 'magicButton'],
			[[['Shift', 'Alt', 'L']], 'launch'],

			[['MediaStop'], 'pause']
		]);

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

	export function init(refs: {
		activeWindow: Electron.BrowserWindow;
		tray: Electron.Tray;
		DEBUG: boolean;
	}, launch: () => void) {
		const {activeWindow, DEBUG, tray } = refs;
		remote.activeWindow = activeWindow;
		remote.launch = launch;
		remote.DEBUG = DEBUG;
		remote.tray = tray;

		for (let [keys, command] of map.entries()) {
			for (let key of keys) {
				const keyCommand = Array.isArray(key) ? key.join('+') : key;

				globalShortcut.register(keyCommand as any, () => {
					log(`Key ${keyCommand} was pressed, launching command ${command}`);
					if (handleEvent(command)) {
						return;
					}
					sendMessage(command);
				});
			}
		}
	}
}