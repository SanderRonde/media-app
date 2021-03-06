import { YoutubeVideoPlayer, YoutubeMusicWindow } from '../../window/views/youtubeMusic';
import { Partitions } from '../../backgroundLibs/adblocking/adblocking';
import { embeddableSend } from '../../backgroundLibs/msg/msg';
import { route } from '../../backgroundLibs/routing/routing';
import { ViewNames } from '../../window/views/appWindow';
import { EmbeddedFns } from '../libs/embedmsg';
import { shell } from 'electron';
import * as md5 from 'md5';
import * as fs from 'fs';

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
	};

export const $$ = <K extends keyof ElementTagNameMap>(selector: K|string,
	base: HTMLElement|Element|Document = document): NodeListOf<HTMLElement> => {
		return base.querySelectorAll(selector) as NodeListOf<HTMLElement>;
	};

export function inlineFn(fn: () => void): string {
	return `(${fn.toString()})()`;
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

export namespace Util {
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
		[key: string]: number|string|boolean|((...args: any[]) => void);
	}): string {
		Object.getOwnPropertyNames(parameters).forEach((key) => {
			const arg = parameters[key];
			if (typeof arg === 'string' && arg.split('\n').length > 1) {
				code = code.replace(new RegExp(`REPLACE\.${key}`, 'g'), 
					`' + ${JSON.stringify(arg.split('\n'))}.join('\\n') + '`);
			} else if (typeof arg === 'function') {
				code = code.replace(new RegExp(`REPLACE\.${key}`, 'g'),
					`(${arg.toString()})`);
			} else {
				code = code.replace(new RegExp(`REPLACE\.${key}`, 'g'), 
					arg !== undefined && arg !== null && typeof arg === 'string' ?
						arg.replace(/\\\"/g, `\\\\\"`) : arg.toString());
			}
		});
		return code;
	}

	export function hacksecute<T extends {
		[key: string]: number|string|boolean|((...args: any[]) => void);
	}>(view: Electron.WebviewTag, fn: (REPLACE: T & EmbeddedFns) => void, parameters: T = {} as T) {
		if (!view.src) {
			return new Promise<any>((resolve) => {
				resolve(undefined);
			});
		}
		return new Promise<any>((resolve) => {
			view.executeJavaScript(replaceParameters(`(${createTag(fn).toString()})();`, parameters), false, (result) => {
				resolve(result);
			});
		});
	}

	export function execute<T extends {
		[key: string]: number|string|boolean;
	}>(view: Electron.WebviewTag, fn: (REPLACE: T) => void, parameters?: T) {
		if (!view.src) {
			return new Promise<any>((resolve) => {
				resolve(undefined);
			});
		}
		return new Promise<any>((resolve) => {
			view.executeJavaScript(replaceParameters(`(${fn.toString()})();`, parameters || {}), false, (result) => {
				resolve(result);
			});
		});
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
			const searchPageView = $('#downloadVideoView');
			searchPageView && searchPageView.remove();
		}
		shell.openExternal(`https://ytmp3.cc/#v${url.split('?v=')[1]}`);
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
	};

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
			console.log('Running files', config.files, 'on url', view.getURL());
			Promise.all<string>(config.files.map((filepath: string) => {
				return new Promise<string>(async (resolve) => {
					filepath = await route(filepath);
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
			await Util.wait(500);
		}
		
		if (url.indexOf('example.com') > -1) {
			//Make background white
			runCodeType(view, {
				code: EXAMPLE_STYLES
			}, false);
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
			onTriggered();
			fn();
		};
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
		});
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
		partition: Partitions;
		parentId: string;
		nodeIntegration?: boolean;
		plugins?: boolean;
	}): Promise<Electron.WebviewTag> {
		return new Promise((resolve) => {
			const { id, partition, parentId, nodeIntegration, plugins } = settings;

			const view = document.createElement('webview');
			view.setAttribute('preload', './libs/embedmsg.js')
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
			});
			view.addEventListener('dom-ready', () => {
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

	export namespace YoutubeVideoFunctions {
		declare const sendMessage: typeof embeddableSend;

		export function adSkipper() {
			window.setInterval(() => {
				let adContainer: HTMLElement = null;
				if ((adContainer = document.querySelector('.videoAdUiSkipContainer') as HTMLElement)) {
					if (adContainer.style.display !== 'none') {
						(document.querySelector('.videoAdUiSkipButton') as HTMLButtonElement).click();
					}
				}
			}, 500);
		}

		export function volumeManager(player: YoutubeVideoPlayer, setGain: (gain: number) => void) {
			const volumeBar = document.createElement('div');
			const volumeBarBar = document.createElement('div');
			const volumeBarNumber = document.createElement('div');

			volumeBar.id = 'yt-ca-volumeBar';
			volumeBarBar.id = 'yt-ca-volumeBarBar';
			volumeBarNumber.id = 'yt-ca-volumeBarNumber';

			volumeBar.appendChild(volumeBarNumber);
			volumeBar.appendChild(volumeBarBar);
			document.body.appendChild(volumeBar);

			let volumeBarTimeout: number = null;

			function setPlayerVolume(volume: number) {
				if (volume > 100) {
					setGain(volume / 100.0);
				} else {
					setGain(1.0);
				}	
				currentVolume = volume;
				player.setVolume(Math.min(volume, 100));

				localStorage.setItem('yt-player-volume', JSON.stringify({
					data: JSON.stringify({
						volume: Math.min(volume, 100),
						muted: (volume === 0)
					}),
					creation: Date.now(),
					expiration: Date.now() + (30 * 24 * 60 * 60 * 1000) //30 days
				}));
			}

			function getVolumeDelta(volume: number): number {
				if (volume < 10) {
					return 1;
				}
				return 5;
			}

			function roundVolume(volume: number, isLouder: boolean): number {
				if (volume > 25 && volume % 5 !== 0) {
					//Round to nearest 5
					if (isLouder) {
						return volume + (5 - (volume % 5));
					} else {
						return volume - (volume % 5);
					}
				}
				return volume;
			}

			let currentVolume: number = parseInt(localStorage.getItem('volume'), 10) || player.getVolume();

			//Code that has to be executed "inline"
			function increaseVolume() {
				const oldVolume = currentVolume;
				const newVolume = oldVolume + getVolumeDelta(oldVolume);
				setPlayerVolume(roundVolume(newVolume, true));
			}

			function lowerVolume() {
				const oldVolume = currentVolume;
				const newVolume = Math.max(oldVolume - getVolumeDelta(oldVolume), 0);
				setPlayerVolume(roundVolume(newVolume, false));
			}

			(window as YoutubeMusicWindow).increaseVolume = increaseVolume;
			(window as YoutubeMusicWindow).lowerVolume = lowerVolume;

			function getColorAtIndex(index: number): string {
				//Loop from red -> orange -> yellow -> green -> blue -> purple -> red
				if (index === -1) {
					return 'transparent';
				}
				const colors = [
					'#F44336',
					'#f47c36',
					'#f4dd36',
					'#6ef436',
					'#36bff4',
					'#7f36f4'
				];
				return colors[index % colors.length];
			}

			function getVolumeBarLook(volume: number): {
				foreground: string;
				background: string;
				progress: number;
			} {
				let hundreds = Math.floor(volume / 100);
				if (hundreds === 0) {
					return {
						background: 'transparent',
						foreground: '#F44336',
						progress: volume / 100
					}
				}
				return {
					background: getColorAtIndex(hundreds - 1),
					foreground: getColorAtIndex(hundreds),
					progress: (volume % 100) / 100
				}
			}

			function showVolumeBar() {
				const volume = currentVolume;
				localStorage.setItem('volume', `${volume}`);
				volumeBarNumber.innerHTML = `${volume}`;

				const { background, foreground, progress } = getVolumeBarLook(volume);
				volumeBar.style.backgroundColor = background;
				volumeBarBar.style.backgroundColor = foreground;
				volumeBarBar.style.transform = `scaleX(${progress})`;
				volumeBar.classList.add('visible');
				if (volumeBarTimeout !== null) {
					window.clearTimeout(volumeBarTimeout);
				}
				volumeBarTimeout = window.setTimeout(() => {
					volumeBar.classList.remove('visible');
					volumeBarTimeout = null;
				}, 2000);
			}

			function onScroll(isDown: boolean) {
				if (isDown) {
					lowerVolume();
				} else {
					increaseVolume();
				}
				showVolumeBar();
			}

			window.onwheel = (e) => {
				onScroll(e.deltaY > 0);
			};
		}
		
		export function playPauseListeners(view: ViewNames) {
			new Promise<HTMLVideoElement>((resolve) => {
				const interval = window.setInterval(() => {
					if (document.getElementsByTagName('video')[0]) {
						window.clearInterval(interval);
						resolve(document.getElementsByTagName('video')[0]);
					}
				}, 100);
			}).then((video) => {
				video.onplay = () => {
					sendMessage('toWindow', 'onPlay', view);
				};
				video.onpause = () => {
					sendMessage('toWindow', 'onPause', view);
				};
			});
		}

		export function initialSizing(player: YoutubeVideoPlayer, loaded: ViewNames|null, onload?: () => void) {
			function doTempInterval(fn: () => void, interval: number, max: number) {
				const intervalId = window.setInterval(fn, interval);
				window.setTimeout(() => {
					window.clearInterval(intervalId);
				}, max);
			}

			function prepareVideo() {
				setTimeout(() => {							
					function reloadIfAd() {
						if (player.getAdState() === 1) {
							window.location.reload();
						}

						if (player.getPlayerState() === 3) {
							window.setTimeout(reloadIfAd, 250);
						} else {
							player.setPlaybackQuality('hd1080');
							if (player.getPlaybackQuality() !== 'hd1080') {
								player.setPlaybackQuality('hd720');
							}

							if (loaded !== null) {
								localStorage.setItem('loaded', loaded);
							}
							
							onload && onload();
						}
					}
					reloadIfAd();
				}, 2500);

				doTempInterval(() => {
					player.setSizeStyle(false, true);
				}, 100, 10000);
			}

			prepareVideo();
		}

		export function handleResize(player: YoutubeVideoPlayer) {
			const playerApi = document.getElementById('player-api');

			function updateSizes() {
				playerApi.style.width = window.innerWidth + 'px';
				playerApi.style.height = (window.innerHeight - 15) + 'px';

				player.setSize();
			}

			updateSizes();
			window.addEventListener('resize', updateSizes);
		}

		export function handleToggleHiddens(key: string) {
			window.setTimeout(() => {
				if (Array.from(document.querySelectorAll('a[is="yt-endpoint"]')).filter((a: HTMLAnchorElement) => {
					return a.href.indexOf('accounts.google.com') > -1;
				}).length > 0) {
					sendMessage('log', 'toast', 'Please log in');
					document.body.classList.toggle('showHiddens');
				}
			}, 5000);

			document.body.addEventListener('keydown', (e) => {
				if (e.key === key) {
					//Hide or show video
					document.body.classList.toggle('showHiddens');
				}
			});
		}

		export function handleVisualizer(gainOnly: boolean = false): [() => void, (gain: number) => void] {
			const visualizer = document.createElement('div');
			visualizer.classList.add('ytma_visualization_cont');
			document.body.insertBefore(visualizer, document.body.children[0]);
			let visualizing = false;
			
			function cleanupData(dataArray: Float32Array): number[] {
				for (let i in dataArray) {
					if (dataArray[i] <= -100 || dataArray[i] === -80 || dataArray[i] === -50) {
						dataArray[i] = 0;
						continue;
					}
					dataArray[i] = (dataArray[i] + 100) / 100;
				}

				const newArray = [];

				//Compress it into a max of 120 bars
				const delta = (dataArray.length / 120);
				for (let i = 0; i < dataArray.length; i += delta) {
					let average = dataArray.slice(i, i + delta).reduce((a, b) => {
						return a + b;
					}) / delta;
					newArray.push(average);
				}

				return newArray;
			}

			function renderBars(data: AudioVisualizerSettings) {
				data.bars.forEach((element, index) => {
					element.style.transform = `scaleY(${data.parsedArray[index] * 1.5})`;
				});
			}

			function visualize(this: AudioVisualizerSettings) { 
				this.analyser.getFloatFrequencyData(this.dataArray);
				this.parsedArray = cleanupData(this.dataArray);

				renderBars(this);

				if (visualizing) {
					window.requestAnimationFrame(visualize.bind(this));
				}
			}

			interface AudioVisualizerSettings {
				video: HTMLVideoElement;
				ctx: AudioContext;
				gainNode: GainNode;
				analyser: AnalyserNode;
				vidSrc: MediaElementAudioSourceNode;
				dataArray: Float32Array;
				bars: HTMLElement[];
				parsedArray?: number[];
			}

			function checkForVisualizer(data: AudioVisualizerSettings) {
				const shouldVisualize = document.body.classList.contains('showVisualizer');
				if (visualizing === shouldVisualize) {
					return;
				}
				if (shouldVisualize) {
					visualizing = true;
					localStorage.setItem('visualizing', JSON.stringify(true));
					document.body.classList.add('showVisualizer');
					window.requestAnimationFrame(visualize.bind(data));
				} else {
					document.body.classList.remove('showVisualizer');
					localStorage.setItem('visualizing', JSON.stringify(false));
					visualizing = false;
				}
			}

			let dataSrc: AudioVisualizerSettings = gainOnly ? 
				getContext() : null;

			function setGain(gain: number) {
				if (dataSrc) {
					dataSrc.gainNode.gain.value = gain;
				}
			}

			function getContext(analyze: boolean = false) {
				const data: AudioVisualizerSettings = {} as any;
				data.video = document.querySelector('video') as HTMLVideoElement;
				data.ctx = new AudioContext();

				if (analyze) {
					data.analyser = data.ctx.createAnalyser();
				}
				data.vidSrc = data.ctx.createMediaElementSource(data.video);
				
				data.gainNode = data.ctx.createGain();
				if (analyze) {
					data.vidSrc.connect(data.analyser);
				}
				data.vidSrc.connect(data.gainNode);

				data.gainNode.connect(data.ctx.destination);

				return data;
			}

			function setupVisualizer() {
				const data = getContext(true);

				data.dataArray = new Float32Array(data.analyser.frequencyBinCount);
				data.analyser.getFloatFrequencyData(data.dataArray);

				data.bars = Array(100).join('a').split('a').map((el) => {
					let bar = document.createElement('div');
					bar.classList.add('ytma_visualization_bar');
					visualizer.appendChild(bar);
					return bar;
				});

				dataSrc = data;

				const shouldVisualize = JSON.parse(localStorage.getItem('visualizing') || JSON.stringify(false));
				if (shouldVisualize) {
					document.body.classList.add('showVisualizer');
				}

				window.setInterval(() => {
					checkForVisualizer(data);
				}, 50);
			}

			return [setupVisualizer, setGain];
		}

		export function handleYoutubeMusicTasks() {
			function executeTask(name: string, data: any, id: number) {
				let result = null;
				switch (name) {
					case 'getTime':
						result = (
							document.querySelector('.html5-video-player') as YoutubeVideoPlayer
						).getCurrentTime();
						break;
					case 'getSongName':
						let timestampContainers = document
							.querySelector('#eow-description')
							.querySelectorAll('a[href="#"]');
						const index = data as number;
						const textNodes = [];
						if (!isNaN(index) && timestampContainers[index]) {
							let currentNode = timestampContainers[index].previousSibling as HTMLElement;

							//Search back until a <br> is found
							while (currentNode && currentNode.tagName !== 'BR') {
								if (!currentNode.tagName) {
									textNodes.push(currentNode.nodeValue);
								}
								currentNode = currentNode.previousSibling as HTMLElement;
							}

							currentNode = timestampContainers[index].nextSibling as HTMLElement;

							//Search forward until a <br> is found
							while (currentNode && currentNode.tagName !== 'BR') {
								if (!currentNode.tagName) {
									textNodes.push(currentNode.nodeValue);
								}
								currentNode = currentNode.nextSibling as HTMLElement;
							}

							//Go through list and find something that resembles a song
							for (let i = 0; i < textNodes.length; i++) {
								if (/.+-.+/.test(textNodes[i])) {
									//This is a song
									result = textNodes[i];
									break;
								}
							}

							if (!result) {
								//Just try this instead
								result = textNodes[0];
							}
						} else {
							result = null;
						}
						break;
				}

				localStorage.setItem(`taskResult${id}`, result + '');
			}

			function checkForTasks() {
				let tasks;
				if ((tasks = localStorage.getItem('tasks'))) {
					try {
						tasks = JSON.parse(tasks);
					} catch(e) {
						tasks = [];
					}
					if (Array.isArray(tasks) && tasks.length > 0) {
						tasks.forEach((task) => {
							executeTask(task.name, task.data, task.id);
						});
						localStorage.setItem('tasks', '[]');
					}
				}
			}

			window.setInterval(checkForTasks, 50);
		}

		export function detectOnEnd() {
			const video = document.querySelector('video');
			video.addEventListener('ended', () => {
				sendMessage('toWindow', 'onVideoEnded', null);
			});
		}
	}

	export function el<T extends keyof HTMLElementTagNameMap>(tagName: T, className: string, 
		children: string|HTMLElement|(HTMLElement|string)[] = [], options: {
			props?: {
				[key: string]: string;
			};
			listeners?: {
				[event: string]: ((e: Event) => void)|((e: Event) => void)[]
			};
			init?(): void;
		} = {}): HTMLElementTagNameMap[T] {
			const element = document.createElement(tagName);
			if (className && className.length > 0) {
				element.classList.add(className);
			}

			let childrenArr: (HTMLElement|string)[] = Array.isArray(children) ?
				children : [children];

			for (let child of childrenArr) {
				if (typeof child === 'string') {
					element.innerText = child;
				} else {
					element.appendChild(child);
				}
			}

			for (let key in options.props) {
				element.setAttribute(key, options.props[key]);
			}
			for (let event in options.listeners) {
				const eventListeners = options.listeners[event];
				const listeners = Array.isArray(eventListeners) ? eventListeners : [eventListeners];

				listeners.forEach((listener) => {
					element.addEventListener(event, () => {
						listener.bind(element)();
					});
				});
			}
			if (options.init) {
				options.init.bind(element)();
			}

			return element;
		}

	const activeToasts: Promise<void>[] = [
		new Promise<void>((resolve) => { resolve(); })
	];

	async function doShowToast(message: string): Promise<void> {
		return new Promise<void>(async (resolve) => {
			const toast = $('#mainToast');
			const content = toast.querySelector('#toastContent') as HTMLElement;
			content.innerText = message;

			toast.classList.add('visible');
			await wait(5000);
			toast.classList.remove('visible');
			await wait(500);
			resolve();
		});
	}

	export async function showToast(message: string) {
		const lastItem = activeToasts.slice(-1)[0];
		activeToasts.push(new Promise<void>(async (resolve) => {
			lastItem.then(() => {
				doShowToast(message).then(() => {
					resolve();
					activeToasts.shift();
				});
			});
		}));
	}
}

export default Util;