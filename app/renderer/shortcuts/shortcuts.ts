import { log } from '../log/log'
import { MediaApp } from '../../app';
import { globalShortcut, app } from 'electron'
import { SettingsType } from '../settings/settings';
import { MessageTypes, MessageServer, MessageServerChannel } from '../msg/msg';

export type keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 
	'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
	'W', 'X', 'Y', 'Z', 'Shift', 'Alt', 'Left', 'Right', 'Down',
	'Up', 'MediaNextTrack', 'MediaPreviousTrack', 'MediaStop',
	'MediaPlayPause', 'Space', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export type KeyCombinations = {
	[key in keyof MessageTypes.KeyCommands]: (keys[keyof keys][]|keys[keyof keys])[]
};

export namespace Shortcuts {
	const remote: {
		activeWindow: Electron.BrowserWindow;
		tray: Electron.Tray;
		DEBUG: boolean;
		launch(focus?: boolean): void;
		Settings: SettingsType;
	} = {
		tray: null,
		DEBUG: null,
		launch: null,
		Settings: null,
		activeWindow: null
	}
	let messageServer: MessageServerChannel<'events'>;

	function handleEvent(event: keyof MessageTypes.ExternalEventsMap) {
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

	function sendMessage(data: keyof MessageTypes.ExternalEventsMap) {
		messageServer.send(data, null);
	}

	export function changeKey(command: keyof MessageTypes.ExternalEventsMap, oldKey: any[], newKey: string) {
		globalShortcut.unregister(oldKey.join('+'));
		globalShortcut.register(newKey, () => {
			log(`Key ${newKey} was pressed, launching command ${command}`);
			if (handleEvent(command)) {
				return;
			}
			sendMessage(command);
		});
	}

	function addSettingsListener() {
		remote.Settings.listen('keys', (newVal, oldVal) => {
			const changedKeys: (keyof MessageTypes.ExternalEventsMap)[] = [];
			for (let key in newVal) {
				const command = key as keyof MessageTypes.ExternalEventsMap;
				if (JSON.stringify(<any>(<any>newVal)[command]) !== JSON.stringify(<any>(<any>oldVal)[command])) {
					changedKeys.push(command);
				}
			}

			changedKeys.forEach((key) => {
				changeKey(key, <any>(<any>oldVal)[key], <any>(<any>newVal)[key]);
			});
		});
	};

	export async function init(refs: typeof MediaApp.Refs, launch: () => void, remoteSettings: SettingsType) {
		const {activeWindow, DEBUG, tray } = refs;
		remote.activeWindow = activeWindow;
		remote.Settings = remoteSettings
		remote.launch = launch;
		remote.DEBUG = DEBUG;
		remote.tray = tray;

		const bindings = await remote.Settings.get('keys');
		messageServer = new MessageServer(refs).channel('events');

		for (let command in bindings) {
			const keys = bindings[command as keyof typeof bindings];
			for (let key of keys) {
				const keyCommand = Array.isArray(key) ? key.join('+') : key;

				globalShortcut.register(keyCommand as any, () => {
					log(`Key ${keyCommand} was pressed, launching command ${command}`);
					if (handleEvent(command as keyof MessageTypes.ExternalEventsMap)) {
						log(`Key ${keyCommand} was ignored because it launched the app`);
						return;
					}
					sendMessage(command as keyof MessageTypes.ExternalEventsMap);
				});
			}
		}

		addSettingsListener();
	}
}

export type ShortcutsType = typeof Shortcuts;