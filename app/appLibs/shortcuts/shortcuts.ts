import { MessageReasons } from '../../window/appWindow'
import { globalShortcut, app } from 'electron'
import { log } from '../log/log'

export namespace Shortcuts {
	const remote: {
		activeWindowContainer: {
			activeWindow: Electron.BrowserWindow;
		}
		launch(): void;
	} = {
		activeWindowContainer: null,
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
			[['Shift', 'Alt', 'L'], 'launch'],

			[['MediaStop'], 'pause']
		]);

	function handleEvent(event: keyof MessageReasons) {
		switch (event) {
			case 'focus':
				app.focus();
				break;
			case 'launch':
				remote.launch();
				break;
		}
	}

	function sendMessage(data: keyof MessageReasons) {
		remote.activeWindowContainer && remote.activeWindowContainer.activeWindow.webContents.send('fromBgPage', {
			cmd: data,
			type: 'event'
		});
	}

	export function init(activeWindowContainer: {
		activeWindow: Electron.BrowserWindow
		tray: Electron.Tray;
	}, launch: () => void) {
		remote.activeWindowContainer = activeWindowContainer;
		remote.launch = launch;

		for (let [keys, command] of map.entries()) {
			for (let key of keys) {
				const keyCommand = Array.isArray(key) ? key.join('+') : key;

				globalShortcut.register(keyCommand as any, () => {
					log(`Key ${keyCommand} was pressed, launching command ${command}`);
					handleEvent(command);
					sendMessage(command);
				});
			}
		}
	}
}