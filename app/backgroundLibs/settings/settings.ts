import fs = require('fs');
import path = require('path');
import { app } from 'electron';
import { MessageTypes } from '../msg/msg';
import { keys } from '../shortcuts/shortcuts'

export namespace Settings {
	let loaded: boolean = false;
	let loadingResolve: () => void = null;
	const loadingPromise = new Promise<void>((resolve) => {
		loadingResolve = resolve;
	});

	const settingsPath = path.join(app.getPath('appData'), 'media-app', 'settings.json');
	let settings: Settings = null;
	const settingTypes: {
		[P in keyof Settings.Settings]: "string" | "number" | "boolean" | "symbol" | "undefined" | "object" | "function";
	} = {
		launchOnBoot: 'boolean',
		keys: 'object',
		autoUpdate: 'boolean'
	}

	export interface Settings {
		launchOnBoot: boolean;
		keys: {
			[key in keyof MessageTypes.KeyCommands]: (keys[keyof keys][]|keys[keyof keys])[]
		};
		autoUpdate: boolean;
	}

	namespace Listeners {
		type ListenerObj<T extends keyof Settings.Settings = keyof Settings.Settings> = {
			key: T;
			listener(val: Settings.Settings[T], oldValue: Settings.Settings[T]): void
		 }
		const listeners: ListenerObj[] = [];

		export async function addListener<K extends keyof Settings.Settings>(key: K, 
			callback: (newVal: Settings.Settings[K], oldVal: Settings.Settings[K]) => void): Promise<Settings.Settings[K]> {
				listeners.push({
					key: key,
					listener: callback
				});

				return await get(key);
			}

		export function changed<K extends keyof Settings.Settings>(key: K, 
			newVal: Settings.Settings[K], oldVal: Settings.Settings[K]) {
				listeners.forEach((listener) => {
					if (listener.key === key) {
						listener.listener(newVal, oldVal);
					}
				});
			}
	}

	const defaultSettings: Settings.Settings = {
		launchOnBoot: true,
		keys: {
			focus: [['Shift', 'Alt', 'F']],
			lowerVolume: [['Shift', 'Alt', 'Left']],
			raiseVolume: [['Shift', 'Alt', 'Right']],
			pausePlay: [['Shift', 'Alt', 'Down'], 'MediaPlayPause'],
			magicButton:  [['Shift', 'Alt', 'Up'], 'MediaNextTrack'],
			launch: [['Shift', 'Alt', 'L']],
			pause: ['MediaStop']
		},
		autoUpdate: true
	}

	async function assertLoaded(): Promise<void> {
		if (settings === null) {
			await uploadSettings(defaultSettings);
			settings = JSON.parse(JSON.stringify(defaultSettings));
		}
		if (loaded) {
			return null;
		} else {
			return await loadingPromise;
		}
	}

	function uploadSettings(settings: Settings.Settings): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			fs.writeFile(settingsPath, JSON.stringify(settings), (err) => {
				if (err) {
					resolve(false);
				} else {
					resolve(true);
				}
			});
		});
	}

	function readSettings(): Promise<Settings> {
		return new Promise<Settings>((resolve) => {
			fs.readFile(settingsPath, 'utf8', async (err, data) => {
				if (err) {
					//Something went wrong, probably doesn't exist or something, write default
					await uploadSettings(defaultSettings);
					resolve(JSON.parse(JSON.stringify(defaultSettings)));
				} else {
					try {
						resolve(JSON.parse(data));
					} catch(e) {
						//Corrupted, write default
						await uploadSettings(defaultSettings);
						resolve(JSON.parse(JSON.stringify(defaultSettings)));
					}
				}
			});
		});
	}

	export function init() {
		fs.stat(settingsPath, async (err, stats) => {
			if (err) {
				//Doesn't exist, make it
				await uploadSettings(defaultSettings);
				settings = JSON.parse(JSON.stringify(defaultSettings));
			} else {
				settings = await readSettings();
			}
			loadingResolve();
			loaded = true;
		});
		return loadingPromise;
	}

	async function assertType<K extends keyof Settings.Settings>(key: K, value: any): Promise<Settings.Settings[K]> {
		if (typeof value !== settingTypes[key]) {
			//Set that value back to the default value as some corruption has happened
			settings[key] = JSON.parse(JSON.stringify(defaultSettings))[key];
			await uploadSettings(settings);
			return settings[key];
		}
		return value;
	}

	export async function get<K extends keyof Settings.Settings>(key: K): Promise<Settings.Settings[K]> {
		await assertLoaded();

		return await assertType(key, settings[key]);
	}

	export async function set<K extends keyof Settings.Settings>(key: K, val: Settings.Settings[K]) {
		await assertLoaded();

		const oldValue = settings[key];
		settings[key] = val;

		if (oldValue !== val) {
			Listeners.changed(key, val, oldValue);
		}
		await uploadSettings(settings);
	}

	export async function listen<K extends keyof Settings.Settings>(key: K, 
		callback: (newVal: Settings.Settings[K], oldVal: Settings.Settings[K]) => void): Promise<Settings.Settings[K]> {
			await assertLoaded();
			
			return await Listeners.addListener(key, callback);
		}
}

export type SettingsType = typeof Settings;