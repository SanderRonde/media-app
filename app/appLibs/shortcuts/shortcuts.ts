import { MessageReasons } from '../../window/appWindow'
import { globalShortcut } from 'electron'
import { log } from '../log/log'

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

		[['MediaStop'], 'pause']
	]);

function sendMessage(activeWindow: Electron.BrowserWindow, data: keyof MessageReasons) {
	activeWindow && activeWindow.webContents.send('fromBgPage', {
		cmd: data,
		type: 'event'
	});
}

export function registerShortcuts(activeWindowContainer: {
	activeWindow: Electron.BrowserWindow
}) {
	for (let [keys, command] of map.entries()) {
		for (let key of keys) {
			const keyCommand = Array.isArray(key) ? key.join('+') : key;

			globalShortcut.register(keyCommand as any, () => {
				log(`Key ${keyCommand} was pressed, launching command ${command}`);
				sendMessage(activeWindowContainer.activeWindow, command);
			});
		}
	}
}