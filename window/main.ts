import { YoutubeSubscriptions } from './youtubeSubscriptions'
import { AppWindow, ViewNames } from './appWindow'
import { YoutubeSearch } from './youtubeSearch'
import { YoutubeMusic } from './youtubeMusic'
import * as firebase from 'firebase'
import { Helpers } from './helpers'
import { Netflix } from './netflix'
import { dialog } from 'electron'

const firebaseConfig = (require('optional-require') as optionalRequire)(require)<{
	apiKey: string;
	authDomain: string;
	databaseURL: string;
	projectId: string;
	storageBucket: string;
	messagingSenderId: string;	
}>('./genericJs/secrets') || null;
if (firebaseConfig === null) {
	dialog.showMessageBox({
		message: 'Please export your firebase API config in genericJs/secrets.ts',
		buttons: [
			'Relaunch now',
			'Cancel',
		],
		defaultId: 0,
		cancelId: 1
	}, (response) => {
		if (response === 0) {
			ipcRenderer.send('toBgPage', {
				type: 'quit'
			});
		}
	});
}

firebase.initializeApp(firebaseConfig);

declare let window: CustomWindow;

interface CustomWindow extends Window {
	baseView: ViewNames;
	Helpers: typeof Helpers;
	Netflix: typeof Netflix;
	AppWindow: typeof AppWindow;
	YoutubeMusic: typeof YoutubeMusic;
	YoutubeSearch: typeof YoutubeSearch;
	YoutubeSubscriptions: typeof YoutubeSubscriptions;
}

//TODO: this
// namespace AdBlocking {
// 	let ready: boolean = false;
// 	let rules: {
// 		fullMatch: Array<RegExp>;
// 		endsWith: Array<RegExp>;
// 		path: Array<RegExp>;
// 	} = null;

// 	interface RuleBase {
// 		type: 'fullMatch'|'endsWith'|'path';
// 		rule: RegExp;
// 	}

// 	interface FullMatchType extends RuleBase {
// 		type: 'fullMatch';
// 	}

// 	interface EndsWithType extends RuleBase {
// 		type: 'endsWith';
// 	}

// 	interface PathType extends RuleBase {
// 		type: 'path';
// 	}

// 	type Rule = FullMatchType|EndsWithType|PathType;

// 	function getList(): Promise<string> { 
// 		return new Promise<string>((resolve, reject) => {
// 			fs.readFile('adblocking/easylist.txt', 'utf8', (err, data) => {
// 				if (err) {
// 					reject(err)
// 				} else {
// 					resolve(data);
// 				}
// 			});
// 		});
// 	}

// 	const alphabetChar = /[a-z|A-Z]/;
// 	function stringToRegex(url: string): RegExp {
// 		return new RegExp(url.split('').map((char) => {
// 			if (char === '*') {
// 				return '([a-z|A-Z]|[0-9])+';
// 			}
// 			return (alphabetChar.exec(char) ? char : '\\' + char);
// 		}).join(''));
// 	}

// 	function processLine(line: string): Rule {
// 		if (line.indexOf('##') > -1) {
// 			return null;
// 		}

// 		if (line.startsWith('/')) {
// 			return {
// 				type: 'path',
// 				rule: stringToRegex(line)
// 			};
// 		} else if (line.startsWith('||') && line.endsWith('^')) {
// 			return {
// 				type: 'endsWith',
// 				rule: stringToRegex(line)
// 			}
// 		} else if (line.startsWith('|') && line.endsWith('|')) {
// 			return {
// 				type: 'fullMatch',
// 				rule: stringToRegex(line)
// 			};
// 		}
// 		return null;
// 	}

// 	function preProcessList(list: Array<string>): {
// 		fullMatch: Array<RegExp>;
// 		endsWith: Array<RegExp>;
// 		path: Array<RegExp>;
// 	} {
// 		const res = list.map((line) => {
// 			return processLine(line);
// 		}).filter((el) => {
// 			return el !== null;
// 		});
// 		return {
// 			fullMatch: res.filter(item => item.type === 'fullMatch').map(item => item.rule),
// 			endsWith: res.filter(item => item.type === 'endsWith').map(item => item.rule),
// 			path: res.filter(item => item.type === 'path').map(item => item.rule)
// 		}
// 	}

// 	new Promise((resolve) => {
// 		getList().then((fetchedList) => {
// 			rules = preProcessList(fetchedList.split('\n'));
// 			resolve();
// 		});
// 	}).then(() => {
// 		ready = true;
// 	});

// 	function splitURL(url: string): {
// 		path: string;
// 		host: string;
// 	} {
// 		const noProtocol = url.split('://')[1];
// 		const hostAndPathSplit = noProtocol.split('/');
// 		return {
// 			path: hostAndPathSplit[1],
// 			host: hostAndPathSplit[0]
// 		}
// 	}

// 	function isBlocked(url: string): boolean {
// 		const { path, host } = splitURL(url);

// 		for (let i = 0; i < rules.fullMatch.length; i++) {
// 			if (rules.fullMatch[i].exec(url)) {
// 				return true;
// 			}
// 		}
// 		for (let i = 0; i < rules.endsWith.length; i++) {
// 			if (rules.endsWith[i].exec(url) && host.endsWith(rules.endsWith[i].exec(url)[0])) {
// 				return true;
// 			}
// 		}
// 		for (let i = 0; i < rules.path.length; i++) {
// 			if (rules.path[i].exec(url) && path.endsWith(rules.path[i].exec(url)[0])) {
// 				return true;
// 			}
// 		}
// 		return false;
// 	}

// 	export function BlockAd(url: string): boolean {
// 		if (!ready) {
// 			return false;
// 		}

// 		if (isBlocked(url)) {
// 			console.log(`Blocked ad from loading ${url}`);
// 			return true;
// 		}
// 		return false;
// 	}
// }

AppWindow.init('youtubesearch');
window.Helpers = Helpers;
window.Netflix = Netflix;
window.AppWindow = AppWindow;
window.YoutubeMusic = YoutubeMusic;
window.YoutubeSubscriptions = YoutubeSubscriptions;