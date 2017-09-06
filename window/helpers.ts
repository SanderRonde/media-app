import * as fs from 'fs'
import * as md5 from 'md5'
import { shell, ipcRenderer } from 'electron'

export const EXAMPLE_STYLES = `html, body, a {
	background-color: white!important;
	color: white!important;
}`;

interface ElementTagNameMap {
	webview: Electron.WebviewTag;
}

export const $ = <K extends keyof ElementTagNameMap>(selector: K|string,
	base: HTMLElement|Element|Document = document): HTMLElement => {
		return base.querySelector(selector) as HTMLElement;
	}

export const $$ = <K extends keyof ElementTagNameMap>(selector: K|string,
	base: HTMLElement|Element|Document = document): NodeListOf<HTMLElement> => {
		return base.querySelectorAll(selector) as NodeListOf<HTMLElement>;
	}

interface ReducedElement {
	id: string;
	classList: string[];
	tagName: string;
}

export type MappedKeyboardEvent = KeyboardEvent & {
	currentTarget: ReducedElement;
	path: ReducedElement[];
	srcElement: ReducedElement;
	target: ReducedElement;
}

interface MatchPattern {
	scheme: string;
	host: string;
	path: string;
	invalid?: boolean;
}

interface InjectionItems {
	code?: string;
	files?: string[];
}

interface ContentScriptDetails {
	name: string;
	matches: string[]|string;
	exclude_matches?: string[]|string;
	match_about_blank?: boolean;
	css?: InjectionItems;
	js?: InjectionItems;
	run_at?: 'document_start'|'document_end'|'document_idle';
	all_frames?: boolean;
	include_globs?: string[];
	exclude_globs?: string[]; 
}

export namespace Helpers {
	export function stringifyFunction(fn: Function): string {
		return `(${fn.toString()})();`;
	}

	export function toQueryString(obj: {
		[key: string]: any;
	}): string {
		const parts: string[] = [];
		for (let key in obj) {
			parts.push(`${key}=${obj[key]}`);
		}
		return `?${parts.join('&')}`;
	}

	function createTag(fn: Function): string {
		const str = fn.toString();
		return (() => {
			const tag = document.createElement('script');
			tag.innerHTML = `(${str})();`;
			document.documentElement.appendChild(tag);
			document.documentElement.removeChild(tag);
		}).toString().replace('str', str);
	}

	function replaceParameters(code: string, parameters: {
		[key: string]: number|string|boolean;
	}): string {
		Object.getOwnPropertyNames(parameters).forEach((key) => {
			const arg = parameters[key];
			if (typeof arg === 'string' && arg.split('\n').length > 1) {
				code = code.replace(new RegExp(`REPLACE\.${key}`, 'g'), 
					`' + ${JSON.stringify(arg.split('\n'))}.join('\\n') + '`);
			} else {
				code = code.replace(new RegExp(`REPLACE\.${key}`, 'g'), 
					arg !== undefined && arg !== null && typeof arg === 'string' ?
						arg.replace(/\\\"/g, `\\\\\"`) : arg.toString());
			}
		});
		return code;
	}

	export function hacksecute<T extends {
		[key: string]: number|string|boolean;
	}>(view: Electron.WebviewTag, fn: (REPLACE: T) => void, parameters?: T) {
		if (!view.src) {
			return new Promise<any>((resolve) => {
				resolve(undefined);
			});
		}
		return new Promise<any>((resolve) => {
			view.executeJavaScript(replaceParameters(`(${createTag(fn).toString()})();`, parameters || {}), false, (result) => {
				resolve(result);
			});
		});
	}

	let taskIds = 0;
	const taskListeners: {
		[id: number]: (result: any) => void;
	} = {};
	export function returnTaskValue(result: any, id: number) {
		if (taskListeners[id]) {
			taskListeners[id](result);
		}
		delete taskListeners[id];
	};

	export function sendTaskToPage(name: string, page: string, callback: (result: any) => void) {
		ipcRenderer.send('task', {
			name: name,
			page: page,
			id: ++taskIds
		});

		taskListeners[taskIds] = callback;
	}

	export function toArr(iterable: any): any[] {
		const arr = [];
		for (let i = 0; i < iterable.length; i++) {
			arr[i] = iterable[i];
		}
		return arr;
	}

	export function downloadVideo(url: string, removeOverlay: boolean = false) {
		if (removeOverlay) {
			const searchPageView = $('#youtubeSearchPageView');
			searchPageView && searchPageView.remove();
		}
		shell.openExternal(`http://www.youtube-mp3.org/#v${url.split('?v=')[1]}`);
	}

	const MatchPatterns = class MatchPatterns {
		static urlMatchesPattern(pattern: string, url: string) {
			let urlPattern: MatchPattern | '<all_urls>';
			try {
				urlPattern = this._parsePattern(url);
			} catch (e) {
				return false;
			}

			const matchPattern = this._parsePattern(pattern);
			if (urlPattern === '<all_urls>' || matchPattern === '<all_urls>') {
				return true;
			}
			return (this._matchesScheme(matchPattern.scheme, urlPattern.scheme) &&
				this._matchesHost(matchPattern.host, urlPattern.host) &&
				this._matchesPath(matchPattern.path, urlPattern.path));
		}

		private static _parsePattern(url: string): MatchPattern | '<all_urls>' {
			if (url === '<all_urls>') {
				return '<all_urls>';
			}

			try {
				const [scheme, hostAndPath] = url.split('://');
				const [host, ...path] = hostAndPath.split('/');

				return {
					scheme: scheme,
					host: host,
					path: path.join('/')
				};
			} catch (e) {
				return {
					scheme: '*',
					host: '*',
					path: '*',
					invalid: true
				};
			}
		}
		private static _matchesScheme(scheme1: string, scheme2: string): boolean {
			if (scheme1 === '*') {
				return true;
			}
			return scheme1 === scheme2;
		}
		private static _matchesHost(host1: string, host2: string): boolean {
			if (host1 === '*') {
				return true;
			}

			if (host1[0] === '*') {
				const host1Split = host1.slice(2);
				const index = host2.indexOf(host1Split);
				return index === host2.length - host1Split.length;
			}

			return (host1 === host2);
		}
		private static _matchesPath(path1: string, path2: string): boolean {
			const path1Split = path1.split('*');
			const path1Length = path1Split.length;
			const wildcards = path1Length - 1;

			if (wildcards === 0) {
				return path1 === path2;
			}

			if (path2.indexOf(path1Split[0]) !== 0) {
				return false;
			}

			path2 = path2.slice(path1Split[0].length);
			for (let i = 1; i < path1Length; i++) {
				if (path2.indexOf(path1Split[i]) === -1) {
					return false;
				}
				path2 = path2.slice(path1Split[i].length);
			}
			return true;
		}
	}

	function ensureNoPrevExec(code: string): string {
		return `(() => {
			if (window['${md5(code)}'] === true) {
				return;
			}
			window['${md5(code)}'] = true;
			
			${code}
		})()`;
	}

	function runCodeType(view: Electron.WebviewTag, config: InjectionItems, isJS: boolean) {
		if (isJS) {
			view.executeJavaScript('var exports = exports || {}', false);			
		}
		if (config.code) {
			if (isJS) {
				view.executeJavaScript(ensureNoPrevExec(config.code), false);
			} else {
				view.insertCSS(config.code);
			}
		}
		if (config.files) {
			Promise.all<string>(config.files.map((filepath: string) => {
				return new Promise<string>((resolve) => {
					fs.readFile(filepath, 'utf8', (err, data) => {
						if (err) {
							console.error('Error loading file', filepath, err);
						} else {
							resolve(data);
						}
					});
				});
			})).then((fileContents) => {
				fileContents.forEach(async (fileContent) => {
					if (isJS) {
						view.executeJavaScript(ensureNoPrevExec(fileContent), false);
					} else {
						view.insertCSS(fileContent);
					}
				});
			});
		}
	}

	async function runScripts(url: string, view: Electron.WebviewTag, config: ContentScriptDetails) {
		if (config.run_at === 'document_start') {
			await Helpers.wait(150);
		}
		
		if (url.indexOf('example.com') > -1) {
			//Make background white
			runCodeType(view, {
				code: EXAMPLE_STYLES
			}, false)
			return;
		}

		let matches: boolean = false;
		config.matches = Array.isArray(config.matches) ? config.matches : [config.matches];
		for (let j = 0; j < config.matches.length; j++) {
			if (MatchPatterns.urlMatchesPattern(config.matches[j], url)) {
				matches = true;
				break;
			}
		}
		
		if (matches) {
			config.css && runCodeType(view, config.css, false);
			config.js && runCodeType(view, config.js, true);
		}
	}

	export function addContentScripts(view: Electron.WebviewTag, configArr: ContentScriptDetails[]) {
		view.addEventListener('load-commit', (e) => {
			if (!e.isMainFrame) {
				return;
			}
			
			for (let i = 0 ; i < configArr.length; i++) {
				if (configArr[i].run_at === 'document_start') {
					runScripts(e.url, view, configArr[i]);
				}
			}
		});
		view.addEventListener('dom-ready', (e) => {
			for (let i = 0 ; i < configArr.length; i++) {
				if (configArr[i].run_at !== 'document_start') {
					runScripts(view.getURL(), view, configArr[i]);
				}
			}
		});
	}

	function genOnceListener(fn: Function, onTriggered: () => void): Function {
		return () => {
			onTriggered()
			fn();
		}
	}

	export function once<Y extends string>(target: Electron.WebviewTag, event: Y, fn: Function) {
		const listener = genOnceListener(fn, () => {
			target.removeEventListener(event as any, listener as any);
		});
		target.addEventListener(event as any, listener as any);
	}

	export function wait(duration: number): Promise<void> {
		return new Promise<void>((resolve) => {
			window.setTimeout(() => {
				resolve();
			}, duration);
		})
	}

	export function delay(fn: () => Promise<any>|void, duration: number): Promise<void> {
		return new Promise<void>((resolve) => {
			window.setTimeout(async () => {
				await fn();
				resolve();
			}, duration);
		});
	}

	export function createWebview(settings: {
		id: string;
		partition: string;
		parentId: string;
		nodeIntegration?: boolean;
		plugins?: boolean;
	}): Promise<Electron.WebviewTag> {
		return new Promise((resolve) => {
			const { id, partition, parentId, nodeIntegration, plugins } = settings;

			const view = document.createElement('webview');
			let hasListener = false;
			view.addEventListener('did-finish-load' as any, () => {
				if (view.getURL().indexOf('example.com') > -1) {
					view.insertCSS(EXAMPLE_STYLES);
				}

				if (!hasListener) {
					view.addEventListener('new-window', (e) => {
						shell.openExternal(e.url);
					});
					hasListener = true;
				}

				console.log('Done loading', view);
				resolve(view);
			});

			view.setAttribute('partition', `persist:${partition}`);
			if (nodeIntegration !== false) {
				view.setAttribute('nodeintegration', '');
			}
			if (plugins) {
				view.setAttribute('plugins', '');
			}
			view.id = id;
			view.src = 'about:blank';
			$(`#${parentId}`).appendChild(view);
		});
	}
}