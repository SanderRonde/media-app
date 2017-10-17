import { KeyCombinations } from '../../backgroundLibs/shortcuts/shortcuts';
import { MessageServer, MessageTypes } from '../../backgroundLibs/msg/msg';
import { SettingsType } from '../../backgroundLibs/settings/settings';
import { toast } from './../../backgroundLibs/log/log';
import { YoutubeMusic } from '../views/youtubeMusic';
import { SuggestionBar } from './suggestionBar';
import { AppWindow } from '../views/appWindow';
import { MediaAppType } from '../../app';
import { Util } from './util';

declare const MediaApp: MediaAppType;
declare const Settings: SettingsType;

type ImportNullifyingFn = (YoutubeSubscriptions: void, 
	YoutubeSearch: void,
	YoutubeMusic: void,
	SuggestionBar: void,
	AppWindow: void,
	Netflix: void,
	CommandBar: void) => void;


interface CommandFnDescriptor {
	fn(...args: string[]): void;
	args: {
		name: string|((...args: string[]) => Promise<string>);
		enums?: string[]|((...args: string[]) => Promise<string[]>);
	}[];
}

export namespace Commands {
	const messageServer = new MessageServer();
	const evalServer = messageServer.channel('eval');
	const settingsServer = messageServer.channel('settings');
	const toBgPageChannel = messageServer.channel('toBgPage');

	function runRenderer(func: ImportNullifyingFn): () => void {
		return () => {
			evalServer.send('eval', Util.stringifyFunction(func));
		};
	}

	function sendAppWindowEvent(event: keyof MessageTypes.ExternalEventsMap) {
		return fn(() => {
			AppWindow.onShortcut(event);
		});
	}

	function sendBgPageEvent(event: MessageTypes.ToBgPageCommands) {
		return fn(() => {
			toBgPageChannel.send(event, null);
		});
	}

	function fn(func: (...args: string[]) => void, ...enums: {
		name: string|((...args: string[]) => Promise<string>);
		enums?: string[]|((...args: string[]) => Promise<string[]>);
	}[]): CommandFnDescriptor {
		return {
			fn: func,
			args: enums
		};
	}

	const KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 
	'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
	'W', 'X', 'Y', 'Z', 'Shift', 'Alt', 'Left', 'Right', 'Down',
	'Up', 'MediaNextTrack', 'MediaPreviousTrack', 'MediaStop',
	'MediaPlayPause', 'Space', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

	export const commands = {
		'Lower Volume': sendAppWindowEvent('lowerVolume'),
		'Raise Volume': sendAppWindowEvent('raiseVolume'),
		'Pause': sendAppWindowEvent('pause'),
		'Play': sendAppWindowEvent('play'),
		'Pause/Play': sendAppWindowEvent('pausePlay'),
		'Focus': sendAppWindowEvent('focus'),
		'Magic Button': sendAppWindowEvent('magicButton'),
		'Switch to view youtubeSubscriptions': sendAppWindowEvent('youtubeSubscriptions'),
		'Switch to view youtubeMusic': sendAppWindowEvent('youtubeMusic'),
		'Switch to view youtubeSearch': sendAppWindowEvent('youtubeSearch'),
		'Switch to view netflix': sendAppWindowEvent('netflix'),
		'Go right': sendAppWindowEvent('right'),
		'Go up': sendAppWindowEvent('up'),
		'Go down': sendAppWindowEvent('down'),
		'Go left': sendAppWindowEvent('left'),
		'Toggle video visibility': sendAppWindowEvent('toggleVideo'),
		'Switch to view': fn((view: 'youtubeSubscriptions'|'youtubeMusic'|'youtubeSearch'|'netflix') => {
			AppWindow.onShortcut(view);
		}, {
			name: 'view',
			enums: ['youtubeSubscriptions', 'youtubeMusic', 'youtubeSearch', 'netflix']
		}),
		'Cast': fn((url: string) => {
			AppWindow.onShortcut('cast', url);
		}, {
			name: 'url'
		}),
		'Hidden Cast': fn((url: string) => {
			AppWindow.onShortcut('cast', url);
		}, {
			name: 'url'
		}),
		'Open window devtools': sendBgPageEvent('openDevTools'),
		'Enter fullscreen': sendBgPageEvent('enterFullscreen'),
		'Exit fullscreen': sendBgPageEvent('exitFullscreen'),
		'Minimize': sendBgPageEvent('minimize'),
		'Maximize': sendBgPageEvent('maximize'),
		'Close window': sendBgPageEvent('close'),
		'Quit': sendBgPageEvent('quit'),

		'Relaunch': fn(() => {
			require('electron').remote.app.relaunch();
			require('electron').remote.app.quit();
		}),
		'Disable AutoLaunch': fn(() => {
			runRenderer(() => {
				Settings.set('launchOnBoot', false);
			});
		}),
		'Enable AutoLaunch': fn(() => {
			runRenderer(() => {
				Settings.set('launchOnBoot', true);
			});
		}),
		'Restart server': fn(() => {
			runRenderer(() => {
				MediaApp.Setup.activeServer.restart();
			});
		}),
		'Shut down server': fn(() => {
			runRenderer(() => {
				MediaApp.Setup.activeServer.shutdown();
			});
		}),
		'Start server': fn(() => {
			runRenderer(() => {
				MediaApp.Setup.activeServer.start();
			});
		}),
		'Change server port': fn((port: string) => {
			runRenderer(() => {
				MediaApp.Setup.activeServer.restart(~~port);
			});
		}, {
			name: 'Port'
		}),
		'Change key binding': fn(async (command: keyof KeyCombinations, shortcut: string) => {
			const keys = shortcut.split('+');
			for (let key of keys) {
				if (KEYS.indexOf(key) === -1) {
					toast('Invalid key binding');
					return;
				}
			}

			const keyMap = await settingsServer.send('getSetting', 'keys') as KeyCombinations;
			keyMap[command] = shortcut.split('+') as any[];
			settingsServer.send('setSetting', {
				key: 'keys',
				val: keyMap
			});

		}, {
			name: 'Command',
			enums: ['focus', 'lowerVolume', 'raiseVolume', 'pausePlay', 'magicButton', 'launch', 'pause']
		}, {
			async name(command: keyof KeyCombinations) {
				const keys = await settingsServer.send('getSetting', 'keys') as KeyCombinations;
				return keys[command].join('+');
			}
		}),
		'Free Memory on view': fn((view: 'youtubeSubscriptions'|'youtubeMusic'|'youtubeSearch'|'netflix') => {
			switch (view) {
				case 'youtubeMusic':
					AppWindow.free('ytmusic');
					break;
				case 'netflix':
					AppWindow.free('netflix');
					break;
				case 'youtubeSearch':
					AppWindow.free('youtubesearch');
					break;
				case 'youtubeSubscriptions':
					AppWindow.free('youtubeSubscriptions');
					break;
			}
		}, {
			name: 'View',
			enums: ['youtubeSubscriptions', 'youtubeMusic', 'youtubeSearch', 'netflix']
		}),
		'Free Memory on all except current': fn(() => {
			const current = AppWindow.getActiveViewName();
			AppWindow.freeAllExcept(current);
		}),
		'Reload YoutubeMusic video': fn(() => {
			YoutubeMusic.reload();
		})
	};
}


type SuggestionObj = {
	value: string;
	isFinal?: boolean;
	isSuggestion: boolean;
}[];

type SuggestionsArr = SuggestionObj[];

interface SuggestionGenerationBaseObj {
	arr: SuggestionObj;
	full: string;
	priority: number;
};

interface SuggestionGenerationAcronymObj extends SuggestionGenerationBaseObj {
	type: 'acronym';
	commandParts: {
		full: string;
		original: string[];
		lowercase: string[];
	};
	permutation: string[];
}

interface SuggestionGenerationContainsObj extends SuggestionGenerationBaseObj {
	type: 'contains';
}

type SuggestionGenerationObj = SuggestionGenerationAcronymObj|SuggestionGenerationContainsObj;

type SuggestionGenerationArr = SuggestionGenerationObj[];

enum PRIORITIES {
	ACRONYM = 2
}

export namespace CommandBar {
	const MAX_SUGGESTIONS = 10;
	const MAX_ACRONYM_SHORTCUT_LENGTH = 5;

	const commandKeys: (keyof typeof Commands.commands)[] = Object.getOwnPropertyNames(Commands.commands) as any;
	const splitCommands = commandKeys.map((command) => {
		const split = command.split(' ');
		return {
			full: command,
			original: split,
			lowercase: split.map(e => e.toLowerCase())
		};
	});
	let lastAcronymSuggestions: SuggestionGenerationAcronymObj[] = [];	

	const suggestionBar = new SuggestionBar({
		searchBarId: 'commandBarInput',
		container: 'commandBarCentererContainer',
		placeholder: 'Command'
	}, () => {
		return {
			async exec(result: string, getArgs: (names: {
				name: string|((...args: string[]) => Promise<string>);
				enums?: string[]|((...args: string[]) => Promise<string[]>);
			}[]) => Promise<string[]>) {
				const toDo = Commands.commands[result as keyof typeof Commands.commands];
				if (toDo) {
					const { fn, args } = toDo;
					const fnArgs = await getArgs(args);
					if (fnArgs !== null) {
						fn(...fnArgs);
					}
				}
			},
			hide() {
				hide();
			},
			async getSuggestions(query: string): Promise<{
				value: string;
				isSuggestion: boolean;
			}[][]> {
				return new Promise<{
					value: string;
					isSuggestion: boolean;
				}[][]>((resolve) => {
					resolve(Suggestions.getSuggestions(query));
				});
			}
		};
	});
	const container = document.getElementById('commandBarCentererContainer');

	namespace Suggestions {
		function getCombinations(str: string): string[] {
			if (str.length > 1) {
				const results: string[] = [];
				const currentQueryCombinations = getCombinations(str.slice(0, -1));	
				currentQueryCombinations.forEach((currentQuery) => {
					results.push(currentQuery + str.slice(-1));
					results.push(currentQuery + ' ' + str.slice(-1));
					results.push(currentQuery);
				});
				return results;
			} else {
				return [str];
			}
		}

		function last<T>(arr: T[]): T {
			return arr[arr.length - 1];
		}

		function getUnchangedAcronymSuggestions(query: string): SuggestionGenerationAcronymObj[] {
			const unchangedSuggestions: SuggestionGenerationAcronymObj[] = [];

			//Check if any acronyms that were suggested before still are
			for (let i = 0; i < lastAcronymSuggestions.length; i++) {
				const { commandParts, permutation, arr, full } = lastAcronymSuggestions[i];
				const { lowercase, original } = commandParts;

				//Either there's supposed to be another part after the old acronym
				//aka Foo Bar ->Baz when search string is FBB
				//or it's the last part again
				//aka Foo BAr when search string is FBA
				const lastQueryLetter = query.slice(-1).toLowerCase();
				const noSpaceLastPerm = last(permutation) + lastQueryLetter;
				if (original.length > permutation.length &&
					lowercase[permutation.length].startsWith(lastQueryLetter)) {
						unchangedSuggestions.push({
							type: 'acronym',
							arr: arr.slice(0, -1).concat([{
								isSuggestion: false,
								value: lastQueryLetter
							}, {
								isSuggestion: true,
								value: lowercase[permutation.length].slice(1)
							}]),
							commandParts: commandParts,
							full: full,
							permutation: permutation.concat(lastQueryLetter),
							priority: PRIORITIES.ACRONYM
						});
						if (lowercase.length > permutation.length + 1) {
							last(unchangedSuggestions).arr.push({
								isSuggestion: true,
								isFinal: true,
								value: ' ' + lowercase.slice(permutation.length + 1).join(' ')
							});
						}
					} else if (last(lowercase).startsWith(noSpaceLastPerm)) {
						unchangedSuggestions.push({
							type: 'acronym',
							arr: (last(arr).isFinal ? arr.slice(0, -3) : arr.slice(0, -2)).concat([{
								isSuggestion: false,
								value: noSpaceLastPerm
							}, {
								isSuggestion: true,
								value: lowercase[permutation.length].slice(last(permutation).length + 1)
							}]),
							commandParts: commandParts,
							full: full,
							permutation: permutation.slice(0, -1).concat(noSpaceLastPerm),
							priority: PRIORITIES.ACRONYM
						});
						if (lowercase.length > permutation.length) {
							last(unchangedSuggestions).arr.push({
								isSuggestion: true,
								isFinal: true,
								value: ' ' + lowercase.slice(permutation.length).join(' ')
							});
						}
					}
			}

			return unchangedSuggestions;
		}

		function getAcronymSuggestions(query: string): SuggestionGenerationAcronymObj[] {
			if (query.length > MAX_ACRONYM_SHORTCUT_LENGTH) {
				const unchangedAcronymSuggestions = getUnchangedAcronymSuggestions(query);
				lastAcronymSuggestions = unchangedAcronymSuggestions;
				return unchangedAcronymSuggestions;
			}

			const suggestions: SuggestionGenerationAcronymObj[] = [];
			const combinations = getCombinations(query).map(combination => combination.split(' '));
			splitCommands.forEach((commandParts) => {
				combinations.forEach((combination) => {
					const { original, full, lowercase } = commandParts;
					const suggestion: SuggestionGenerationObj = {
						arr: [],
						full: full,
						priority: PRIORITIES.ACRONYM,
						type: 'acronym',
						commandParts: commandParts,
						permutation: combination
					};
					for (let i = 0; i < lowercase.length; i++) {
						if (!combination[i] || !lowercase[i].startsWith(combination[i].toLowerCase())) {
							return;
						} else {
							suggestion.arr.push({
								isSuggestion: false,
								value: combination[i]
							});
							suggestion.arr.push({
								isSuggestion: true,
								value: original[i].slice(combination[i].length) + 
									((i === original.length - 1) ? '' : ' ')
							});
						}
					}
					if (lowercase.length > combination.length) {
						suggestion.arr.push({
							isSuggestion: true,
							isFinal: true,
							value: ' ' + original.slice(combination.length).join(' ')
						});
					}
					suggestions.push(suggestion);
				});
			});
			lastAcronymSuggestions = suggestions;			
			return suggestions;
		}

		function getContainsSuggestions(query: string): SuggestionGenerationContainsObj[] {
			const suggestions: SuggestionGenerationContainsObj[] = [];

			commandKeys.forEach((commandKey) => {
				let index;
				if ((index = commandKey.toLowerCase().indexOf(query.toLowerCase())) > -1) {
					suggestions.push({
						arr: [{
							isSuggestion: true,
							value: commandKey.slice(0, index)
						}, {
							isSuggestion: false,
							value: query
						}, {
							isSuggestion: true,
							value: commandKey.slice(index + query.length)
						}],
						type: 'contains',
						full: commandKey,
						priority: index
					});
				}
			});

			return suggestions;
		}

		function cut<T>(arr: T[]): boolean {
			const isOverflow = arr.length >= MAX_SUGGESTIONS;
			if (!isOverflow) {
				return false;
			}

			while (arr.length > MAX_SUGGESTIONS) {
				arr.pop();
			}

			return true;
		}

		function filter(arr:SuggestionGenerationArr) {
			const fullOnly = arr.map(obj => obj.full.toLowerCase());

			for (let i = 0; i < fullOnly.length; i++) {
				if (fullOnly.indexOf(fullOnly[i]) !== i) {
					fullOnly.splice(i, 1);
					arr.splice(i, 1);
					i -= 1;
				}
			}
		}

		export function getSuggestions(query: string): SuggestionsArr {
			let suggestions: SuggestionGenerationArr = (getAcronymSuggestions(query) as SuggestionGenerationArr)
				.concat(getContainsSuggestions(query));
			filter(suggestions);
			cut(suggestions);
			const sortedSuggestions = suggestions.sort((a, b) => {
				return a.priority - b.priority;
			});
			return sortedSuggestions.map(obj => obj.arr);
		}
	}

	export function show() {
		container.classList.add('visible');
		suggestionBar.focus();
	}

	function hide() {
		container.classList.remove('visible');
	}

	export function setup() {
		suggestionBar.setup();
	}

	export function escapePress() {
		//If hidden, return false
		if (container.classList.contains('visible')) {
			suggestionBar.escapePress();
			return true;
		}
		return false;
	}
}