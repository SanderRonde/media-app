import * as fs from 'fs'
import * as md5 from 'md5'
import * as firebase from 'firebase'
import { shell, ipcRenderer } from 'electron'
import { firebaseConfig } from '../genericJs/secrets'

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

interface ReducedElement {
	id: string;
	classList: Array<string>;
	tagName: string;
}

type MappedKeyboardEvent = KeyboardEvent & {
	currentTarget: ReducedElement;
	path: Array<ReducedElement>;
	srcElement: ReducedElement;
	target: ReducedElement;
}

const $ = <K extends keyof ElementTagNameMap>(selector: K|string,
	base: HTMLElement|Element|Document = document): HTMLElement => {
		return base.querySelector(selector) as HTMLElement;
	}

function arr(first: number, last: number): Array<number> {
	return Array.from(new Array(1 + last - first)).map((_, index) => {
		return first + index;
	});
}

const VALID_INPUT = arr(65, 90).map((charCode) => {
	return String.fromCharCode(charCode);
}).concat(arr(65,90).map((charCode) => {
	return String.fromCharCode(charCode).toLowerCase();
})).concat(arr(0, 9).map(num => num + '')).concat([
	'!','@','#','$','%','^','&','*','(',')','-','_','+','=','\'','"',
	';',':',',','.','<','>','/','?','\\','|','`','~'
]);

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

interface InjectionItems {
	code?: string;
	files?: Array<string>;
}

interface ContentScriptDetails {
	name: string;
	matches: Array<string>|string;
	exclude_matches?: Array<string>|string;
	match_about_blank?: boolean;
	css?: InjectionItems;
	js?: InjectionItems;
	run_at?: 'document_start'|'document_end'|'document_idle';
	all_frames?: boolean;
	include_globs?: Array<string>;
	exclude_globs?: Array<string>; 
}

interface YoutubeVideoPlayer extends HTMLElement {
	getVolume(): number;
	isMuted(): boolean;
	setVolume(volume: number): void;
	unMute(): void;
	getPlayerState(): number;
	playVideo(): void;
	pauseVideo(): void;
	getAdState(): number;
	setPlaybackQuality(quality: string): void;
	getPlaybackQuality(): string;
	setSizeStyle(expanded: boolean, expandedAgain: boolean): void;
	setSize(): void;
	getCurrentTime(): number;
	seekTo(seconds: number): void;
}

type ViewNames = 'ytmusic'|'netflix'|'youtubeSubscriptions'|'youtubesearch';

interface MatchPattern {
	scheme: string;
	host: string;
	path: string;
	invalid?: boolean;
}

namespace Helpers {
	export function stringifyFunction(fn: Function): string {
		return `(${fn.toString()})();`;
	}

	export function toQueryString(obj: {
		[key: string]: any;
	}): string {
		const parts: Array<string> = [];
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
			return;
		}
		console.log('Hacksecuting', fn);
		view.executeJavaScript(replaceParameters(`(${createTag(fn).toString()})();`, parameters || {}), false);
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

	export function toArr(iterable: any): Array<any> {
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
				fileContents.forEach((fileContent) => {
					if (isJS) {
						view.executeJavaScript(ensureNoPrevExec(fileContent), false);
					} else {
						view.insertCSS(fileContent);
					}
				});
			});
		}
	}

	export function addContentScripts(view: Electron.WebviewTag, configArr: Array<ContentScriptDetails>) {
		view.addEventListener('dom-ready', (e) => {
			if (view.getURL().indexOf('example.com') > -1) {
				return;
			}

			for (let i = 0; i < configArr.length; i++) {
				const config = configArr[i];
				let matches: boolean = false;
				config.matches = Array.isArray(config.matches) ? config.matches : [config.matches];
				for (let j = 0; j < config.matches.length; j++) {
					if (MatchPatterns.urlMatchesPattern(config.matches[i], view.getURL())) {
						matches = true;
						break;
					}
				}
				
				if (matches) {
					config.css && runCodeType(view, config.css, false);
					config.js && runCodeType(view, config.js, true);
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
}

namespace YoutubeMusic {
	let view: Electron.WebviewTag = null;

	namespace Visualization {
		let visualizing = false;

		export function isVisualizing() {
			return visualizing;
		}

		export function toggle() {
			visualizing = !visualizing;
		}
	}

	namespace Content {
		export function init() {
			Helpers.hacksecute(view, () => {
				if ((window as any).executedYTCA) {
					return;
				}
				(window as any).executedYTCA = location.href;

				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				const playerApi = document.getElementById('player-api');
				const volumeBar = document.createElement('div');
				const volumeBarBar = document.createElement('div');
				const volumeBarNumber = document.createElement('div');
				const visualizer = document.createElement('div');
				visualizer.classList.add('ytma_visualization_cont');
				document.body.insertBefore(visualizer, document.body.children[0]);

				volumeBar.id = 'yt-ca-volumeBar';
				volumeBarBar.id = 'yt-ca-volumeBarBar';
				volumeBarNumber.id = 'yt-ca-volumeBarNumber';

				let volumeBarTimeout: number = null;
				let visualizing = false;

				volumeBar.appendChild(volumeBarNumber);
				volumeBar.appendChild(volumeBarBar);
				document.body.appendChild(volumeBar);
				
				function cleanupData(dataArray: Float32Array): Array<number> {
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
					analyser: AnalyserNode;
					vidSrc: MediaElementAudioSourceNode;
					dataArray: Float32Array;
					bars: Array<HTMLElement>;
					parsedArray?: Array<number>;
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

				function setupVisualizer() {
					const data: AudioVisualizerSettings = {} as any;
					data.video = document.querySelector('video') as HTMLVideoElement;
					data.ctx = new AudioContext();
					data.analyser = data.ctx.createAnalyser();
					data.vidSrc = data.ctx.createMediaElementSource(data.video);
					
					data.vidSrc.connect(data.analyser);
					data.vidSrc.connect(data.ctx.destination);

					data.dataArray = new Float32Array(data.analyser.frequencyBinCount);
					data.analyser.getFloatFrequencyData(data.dataArray);

					data.bars = Array(100).join('a').split('a').map((el) => {
						let bar = document.createElement('div');
						bar.classList.add('ytma_visualization_bar');
						visualizer.appendChild(bar);
						return bar;
					});

					const shouldVisualize = JSON.parse(localStorage.getItem('visualizing') || JSON.stringify(false));
					if (shouldVisualize) {
						document.body.classList.add('showVisualizer');
					}

					window.setInterval(() => {
						checkForVisualizer(data);
					}, 50);
				}

				function prepareVideo() {
					let timePassed: number = 0;
					setTimeout(() => {
						timePassed += 500;
						function reloadIfAd() {
							if (player.getAdState() === 1) {
								window.location.reload();
							}

							if (player.getPlayerState() === 3) {
								window.setTimeout(reloadIfAd, 250);
								timePassed += 250;
							} else {
								window.setTimeout(() => {
									player.setPlaybackQuality('hd1080');
									if (player.getPlaybackQuality() !== 'hd1080') {
										player.setPlaybackQuality('hd720');
									}
									
									if (document.querySelector('.ytp-size-button')
											.getAttribute('title') === 'Theatermodus') {
										player.setSizeStyle(true, true);
									}
									setupVisualizer();

										console.log('Done');
									localStorage.setItem('loaded', 'ytmusic');
								}, Math.max(2500 - timePassed, 0));
							}
						}
						reloadIfAd();
					}, 500);
				}

				prepareVideo();

				document.body.addEventListener('keypress', (e) => {
					if (e.key === 'h') {
						//Hide or show video
						document.body.classList.toggle('showHiddens');
					}
				});

				function updateSizes() {
					playerApi.style.width = window.innerWidth + 'px';
					playerApi.style.height = (window.innerHeight - 15) + 'px';

					player.setSize();
				}

				updateSizes();
				window.addEventListener('resize', updateSizes);

				function setPlayerVolume(volume: number) {
					player.setVolume(volume);

					localStorage.setItem('yt-player-volume', JSON.stringify({
						data: JSON.stringify({
							volume: volume,
							muted: (volume === 0)
						}),
						creation: Date.now(),
						expiration: Date.now() + (30 * 24 * 60 * 60 * 1000) //30 days
					}));
				}

				//Code that has to be executed "inline"
				function increaseVolume() {
					let vol = player.getVolume();
					if (player.isMuted()) {
						//Treat volume as 0
						vol = 0;
						player.unMute();
					}

					if (vol <= 10) {
						vol += 1;
					} else {
						vol += 5;
					}
					vol = (vol > 100 ? 100 : vol);
					setPlayerVolume(vol);
				}

				function lowerVolume() {
					let vol = player.getVolume();
					if (!player.isMuted()) {
						if (vol <= 10) {
							vol -= 1;
						} else {
							vol -= 5;
						}
						
						vol = (vol < 0 ? 0 : vol);
						setPlayerVolume(vol);
					}
				}

				function showVolumeBar() {
					const volume = player.getVolume();
					localStorage.setItem('volume', volume + '');
					volumeBarNumber.innerHTML = volume + '';
					volumeBarBar.style.transform = `scaleX(${volume / 100})`;
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

				function addListeners() {
					window.onwheel = (e) => {
						onScroll(e.deltaY > 0);
					};
				}

				addListeners();

				function executeTask(name: string, id: number) {
					let result = null;
					switch (name) {
						case 'getTime':
							result = (
								document.querySelector('.html5-video-player') as YoutubeVideoPlayer
							).getCurrentTime();
							break;
						default:
							if (name.indexOf('getSongName') > -1) {
								let timestampContainers = document
									.querySelector('#eow-description')
									.querySelectorAll('a[href="#"]');
								const index = ~~name.split('getSongName')[1];
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
								executeTask(task.name, task.id);
							});
							localStorage.setItem('tasks', '[]');
						}
					}
				}

				window.setInterval(checkForTasks, 50);
			});
		}
	}

	namespace Downloading {
		let songFoundTimeout: number = null;
		let songFoundName = '';
		export function downloadSong() {
			//Search for it on youtube
			const view = $('#youtubeSearchPageView') as Electron.WebviewTag;

			view.style.display = 'block';
			Helpers.addContentScripts(view, [{
				name: 'youtubeSearchJs',
				matches: ['*://www.youtube.com/*'],
				js: {
					files: ['youtube/youtubeSearch/youtubeSearch.js', 
						'genericJs/keypress.js']
				},
				run_at: 'document_end'
			}, {
				name: 'youtubeSearchCss',
				matches: ['*://www.youtube.com/*'],
				css: {
					files: ['youtube/youtubeSearch/youtubeSearch.css']
				},
				run_at: "document_start"
			}]);

			view.loadURL(`https://www.youtube.com/results?search_query=${
				encodeURIComponent(songFoundName.trim().replace(/ /g, '+')).replace(/%2B/g, '+')
			}&page=&utm_source=opensearch`);
		}
		$('#getSongDownload').addEventListener('click', downloadSong);

		function displayFoundSong(name: string) {
			$('#getSongName').innerHTML = name;
			const dialog = $('#getSongDialog');
			dialog.classList.add('visible');
			dialog.classList.add('hoverable');
			if (songFoundTimeout !== null) {
				window.clearTimeout(songFoundTimeout);
			}
			songFoundName = name;
			songFoundTimeout = window.setTimeout(() => {
				dialog.classList.remove('visible');
				window.setTimeout(() => {
					dialog.classList.remove('hoverable');
				}, 200);
			}, 5000);
		}

		function timestampToSeconds(timestamp: string): number {
			const split = timestamp.split(':');
			let seconds = 0;
			for (let i = split.length - 1; i >= 0; i--) {
				seconds = Math.pow(60, (split.length - (i + 1))) * ~~split[i];
			}
			return seconds;
		}

		function getSongIndex(timestamps: Array<number|null>, time: number): number {
			for (let i = 0; i < timestamps.length; i++) {
				if (timestamps[i] <= time && timestamps[i + 1] >= time) {
					return i;
				}
			}
			return timestamps.length - 1;
		}

		function findOn1001Tracklists(name: string, url: string): Promise<boolean> {
			return new Promise((resolve) => {
				const websiteWebview = $('#1001TracklistsView') as Electron.WebviewTag;
				let currentPage: 'main'|'results'|'none' = 'none';
				Helpers.addContentScripts(websiteWebview, [{
					name: 'comm',
					matches: ['*://*/*'],
					js: {
						files: [
							'genericJs/comm.js',
							'genericJs/keypress.js',
							'youtube/1001tracklists/content.js'
						]
					}
				}]);
				Helpers.once(websiteWebview	, 'did-finish-load', () => {
					if (currentPage === 'none') {
						currentPage = 'main';
					} else if (currentPage === 'main') {
						currentPage = 'results';
					}

					if (currentPage === 'main') {
						Helpers.sendTaskToPage(JSON.stringify([
							'searchFor', name
						]), '1001tracklists', () => {

						});
					} else if (currentPage === 'results') {
						Helpers.sendTaskToPage(JSON.stringify([
							'findItem', url
						]), '1001tracklists', (result: false|string) => {
							if (result !== 'null' && result !== 'false' && result) {
								getTrackFrom1001TracklistsUrl(result);
							} else {
								resolve(false);
							}
							websiteWebview.style.display = 'none';
						});
					}
				});
				websiteWebview.loadURL('https://www.1001tracklists.com');
				websiteWebview.style.display = 'block';
			});
		}

		function getUrlHTML(url: string, data: RequestInit = {
			method: 'GET'
		}): Promise<DocumentFragment> {
			return new Promise((resolve) => {
				window.fetch(url, data).then((response) => {
					return response.text();
				}).then((html) => {
					const doc = document.createRange().createContextualFragment(html);
					resolve(doc);
				});
			});
		}

		function getTrackFrom1001TracklistsUrl(url: string) {
			getUrlHTML(url).then((doc) => {
				const tracks = Helpers.toArr(doc.querySelectorAll('.tlpTog')).map((songContainer) => {
					try {
						const nameContainer = songContainer.querySelector('.trackFormat');
						const namesContainers = nameContainer.querySelectorAll('.blueTxt, .blackTxt');
						const artist = namesContainers[0].innerText; 
						const songName = namesContainers[1].innerText;
						let remix = '';
						if (namesContainers[2]) {
							remix = ` (${namesContainers[2].innerText} ${namesContainers[3].innerText})`;
						}

						if (songContainer.querySelector('.cueValueField').innerText === '') {
							return null;
						}

						const timeField = songContainer.querySelector('.cueValueField').innerText;
						return {
							startTime: timeField === '' ? timestampToSeconds(timeField) : null,
							songName: `${artist} - ${songName}${remix}`
						};
					} catch(e) {
						return null;
					}
				});

				Helpers.sendTaskToPage('getTime', 'youtube', (time) => {
					const index = getSongIndex(tracks.filter((track) => {
						return !!track;
					}).map((track) => {
						return track.startTime;
					}), ~~time);

					let unsure = false;
					if (tracks[index - 1] && tracks[index - 1].startTime === null) {
						unsure = true;
					} else if (tracks[index + 1] && tracks[index + 1].startTime === null) {
						unsure = true;
					}
					const trackName = tracks[index].songName;
					displayFoundSong(unsure ? `???${trackName}???` : trackName);
				});
			});
		}

		export function getCurrentSong() {
			Helpers.sendTaskToPage('getTimestamps', 'youtube', (timestamps: {
				found: true;
				data: Array<number>|string
			}|{
				found: false;
				data: {
					name: string;
					url: string;
				}
			}) => {
				const enableOCR = false;
				if (enableOCR && !timestamps) {
					//Do some OCR magic
					//getSongFromOCR(displayFoundSong);
				} else if (timestamps.found === true) {
					const data = timestamps.data;
					if (!Array.isArray(data)) {
						//It's a link to the tracklist
						getTrackFrom1001TracklistsUrl(data);
					} else {
						Helpers.sendTaskToPage('getTime', 'youtube', (time) => {
							const index = getSongIndex(data, ~~time);
							Helpers.sendTaskToPage('getSongName' + index, 'youtube', (name) => {
								displayFoundSong(name);
							});
						});
					}
				} else {
					//Look if the podcast exists on 1001tracklists
					findOn1001Tracklists(timestamps.data.name, timestamps.data.url).then((found) => {
						if (!found) {
							//Show not found toast
							const toast = $('#mainToast');
							toast.classList.add('visible');
							window.setTimeout(() => {
								toast.classList.remove('visible');
							}, 5000);
						}
					});
				}
			});
		}
	}

	export function getCurrentSong() {
		Downloading.getCurrentSong();
	}

	export namespace Commands {
		export function lowerVolume() {
			Helpers.hacksecute(view, () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				let vol = player.getVolume();
				if (!player.isMuted()) {
					if (vol <= 10) {
						vol -= 1;
					}
					
					vol = (vol < 0 ? 0 : vol);
					player.setVolume(vol);
				}
			});
		}

		export function raiseVolume() {
			Helpers.hacksecute(view, () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				let vol = player.getVolume();
				if (player.isMuted()) {
					//Treat volume as 0
					vol = 0;
					player.unMute();
				}

				if (vol <= 10) {
					vol += 1;
				}
				vol = (vol > 100 ? 100 : vol);
				player.setVolume(vol);
			});
		}

		export function togglePlay() {
			Helpers.hacksecute(view, () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				const state = player.getPlayerState();
				if (state === 2) {
					//Paused
					player.playVideo();
				} else if (state === 1) {
					//Playing
					player.pauseVideo();
				} else {
					//???
				}
			});
		}

		export function pause() {
			Helpers.hacksecute(view, () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				player.pauseVideo();
			});
		}

		export function play() {
			console.trace();
			Helpers.hacksecute(view, () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				player && player.playVideo();
			});
		}
	}

	function blockViewAds() {
		//TODO: this
		// const CANCEL = {
		// 	cancel: true
		// };
		// view.request.onBeforeRequest.addListener((request) => {
		// 	if (AdBlocking.BlockAd(request.url)) {
		// 		return CANCEL;
		// 	}
		// 	return {
		// 		cancel: false
		// 	};
		// }, {
		// 	urls: ['*://*/*']
		// }, ['blocking']);
	}

	function addViewListeners() {
		blockViewAds();
		Helpers.addContentScripts(view, [{
			name: 'js',
			matches: ['*://www.youtube.com/*'],
			js: {
				files: [
					'genericJs/comm.js',
					'genericJs/keypress.js',
					'youtube/content/content.js'
				]
			},
			run_at: 'document_end'
		}, {
			name: 'css',
			matches: ['*://www.youtube.com/*'],
			css: {
				files: ['youtube/content/content.css']
			},
			run_at: 'document_start'
		}]);

		view.addEventListener('did-finish-load', () => {
			if (view.getURL().indexOf('example.com') === -1) {
				Content.init();
			}
		});

		view.addEventListener('load-commit', (e) => {
			if (e.isMainFrame) {
				window.setTimeout(Content.init, 1000);
			}
		});

		view.addEventListener('new-window', (e) => {
			shell.openExternal(e.url);
		});
	}

	function launch(url: string) {
		//TODO: change this lol
		view.loadURL('https://www.youtube.com/watch?v=ih-NNLjTCPs&list=WL&index=804&t=3260');
	}

	function addListeners() {
		AppWindow.listen('onMinimized', () => {
			if (Visualization.isVisualizing()) {
				Helpers.hacksecute(view, () => {
					document.body.classList.remove('showVisualizer');
				});
			}
		});
		AppWindow.listen('onRestored', async () => {
			if (!await AppWindow.sendBackgroundPageMessage('isMinimized') && Visualization.isVisualizing()) {
				Helpers.hacksecute(view, () => {
					document.body.classList.add('showVisualizer');
				});
			}
		});
		Helpers.toArr(document.querySelectorAll('.toast .dismissToast')).forEach((toastButton) => {
			toastButton.addEventListener('click', () => {
				toastButton.parentNode.classList.remove('visible');
			});
		});
	}

	export function init() {
		const db = firebase.database();
		const urlRef = db.ref('url');
		urlRef.once('value', (snapshot) => {
			const snapshotVal = snapshot.val();
			console.log(snapshotVal);
			if (snapshotVal && snapshotVal.url && typeof snapshotVal.url === 'string') {
				launch(snapshotVal.url);
			} else {
				alert('Could not find valid url');
			}
		});
	}

	export function setup() {
		return new Promise((resolve) => {
			const webview = document.getElementById('ytmaWebview') as Electron.WebviewTag;
			webview.addEventListener('dom-ready', () => {
				view = webview;
				addViewListeners();
				addListeners();
				resolve(webview);
			})
		});
	}

	export function onClose() {
		//Save progress
		view.executeJavaScript(`(${(() => {
			const vidId = location.href.split('v=')[1].split('&')[0];
			let vidIndex = location.href.split('index=')[1];
			if (vidIndex.indexOf('&') > -1) {
				vidIndex = vidIndex.split('&')[0];
			}
			const [mins, secs] = document.querySelector('.ytp-time-current').innerHTML.split(':');
			const address = 'https://www.youtube.com/watch';
			const url = `${address}?v=${vidId}&list=WL&index=${vidIndex}&t=${mins}m${secs}s`;
			
			require('electron').ipcRenderer.send('toBgPage', {
				type: 'passAlong',
				data: {
					type: 'saveUrl',
					data: {
						url: url
					}
				}
			});
		}).toString()})()`, false);
	}

	export function onFocus() {
		view && view.focus();
	}

	export function getView(): Electron.WebviewTag {
		return view;
	}

	export function onKeyPress(event: MappedKeyboardEvent): boolean {
		console.log('Key', event, 'was pressed');
		if (AppWindow.getActiveViewName() !== 'ytmusic') {
			return false;
		}
		if (event.key === 'd') {
			Downloading.downloadSong();
			return true;
		} else if (event.key === 'v') {
			Visualization.toggle();
			Helpers.hacksecute(view, () => {
				document.body.classList.toggle('showVisualizer');
			});
			return true;
		} else if (event.key === '?') {
			YoutubeMusic.getCurrentSong();
			return true;
		}
		return false;
	}
}

namespace Netflix {
	function initView(): Promise<Electron.WebviewTag> {
		return new Promise((resolve) => {
			const view = document.getElementById('netflixWebView') as Electron.WebviewTag;
			view.addEventListener('dom-ready', () => {
				resolve(view);
			});
		});
	}

	namespace Video {
		let videoView: Electron.WebviewTag = null;
		let videoPromise: Promise<Electron.WebviewTag> = null;

		export async function getView(): Promise<Electron.WebviewTag> {
			return new Promise<Electron.WebviewTag>((resolve) => {
				if (videoView) {
					resolve(videoView);
				} else {
					videoPromise.then(resolve);
				}
			});
		}

		export async function setup() {
			videoPromise = initView();
			videoView = await videoPromise;
			videoView.id = 'netflixWebView';

			window.setTimeout(() => {
				Helpers.addContentScripts(videoView, [{
					name: 'js',
					matches: ['*://*/*'],
					js: {
						files: [
							'genericJs/comm.js',
							'genericJs/keypress.js',
							'netflix/video/video.js'
						]
					},
					run_at: 'document_idle'
				}])
			}, 10);
		}
	}

	export namespace Commands {
		export function lowerVolume() {
			//Not possible
		}

		export function raiseVolume() {
			//Not possible
		}

		export async function togglePlay() {
			Helpers.hacksecute((await Video.getView()), () => {
				const video = (document.querySelector('video') as HTMLVideoElement);

				if (!(window as any).playerStatus) {
					//The states should be matching now
					(window as any).playerStatus = video.paused ? 
						'paused' : 'playing';
				}

				const playerStatus = (window as any).playerStatus;
				const videoStatus = video.paused ? 
						'paused' : 'playing';
				const playButton = (document.querySelector('.player-control-button') as ClickableElement);

				if (playerStatus === videoStatus) {
					//Statusses match up, switch it the normal way
					playButton.click();
					(window as any).playerStatus = ((window as any).playerStatus === 'playing' ? 'paused' : 'playing');
				} else {
					//Statusses don't match up, hit the button twice
					playButton.click();
					playButton.click();
				}
			});
		}

		export async function pause() {
			Helpers.hacksecute((await Video.getView()), () => {
				const video = (document.querySelector('video') as HTMLVideoElement);
				video.pause();
			});
		}

		export async function play() {
			Helpers.hacksecute((await Video.getView()), () => {
				const video = (document.querySelector('video') as HTMLVideoElement);
				video.play();
			});
		}
	}

	export async function setup() {
		await Video.setup();
	}

	interface ClickableElement extends Element {
		click: () => void;
	}

	export function init() {
		window.setTimeout(async () => {
			(await Video.getView()).loadURL('https://www.netflix.com/browse');
		}, 15);
	}

	export async function onClose() {
		//Go for a semi-clean exit
		(await Video.getView()).src && (await Video.getView()).canGoBack() && (await Video.getView()).goBack();
	}

	export async function onFocus() {
		(await Video.getView()).focus();
	}

	export async function getView(): Promise<Electron.WebviewTag> {
		return (await Video.getView());
	}

	export function onKeyPress(event: MappedKeyboardEvent) { 
		return false;
	}
}

namespace YoutubeSubscriptions {
	function initView(id: string): Promise<Electron.WebviewTag> {
		return new Promise<Electron.WebviewTag>((resolve) => {
			const view = $(`#${id}`) as Electron.WebviewTag;
			view.addEventListener('dom-ready', () => {
				view.addEventListener('new-window', (e) => {
					shell.openExternal(e.url);
				});
				
				resolve(view);
			});
		});
	}

	export namespace Commands {
		export async function lowerVolume() {
			Helpers.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				let vol = player.getVolume();
				if (!player.isMuted()) {
					vol -= 5;
					
					vol = (vol < 0 ? 0 : vol);
					player.setVolume(vol);
				}
			});
		}

		export async function raiseVolume() {
			Helpers.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				let vol = player.getVolume();
				if (player.isMuted()) {
					//Treat volume as 0
					vol = 0;
					player.unMute();
				}

				vol += 5;
				vol = (vol > 100 ? 100 : vol);
				player.setVolume(vol);
			});
		}

		export async function togglePlay() {
			Helpers.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				const state = player.getPlayerState();
				if (state === 2) {
					//Paused
					player.playVideo();
				} else if (state === 1) {
					//Playing
					player.pauseVideo();
				} else {
					//???
				}
			});
		}

		export async function pause() {
			Helpers.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				player.pauseVideo();
			});
		}

		export async function play() {
			Helpers.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				player.playVideo();
			});
			if ((await Video.getView()).src) {
				showVideo();
			}
		}

		export async function magicButton() {
			(await SubBox.getView()).executeJavaScript(Helpers.stringifyFunction(() => {
					(window as any).videos.selected.goLeft();
					(window as any).videos.selected.launchCurrent();
				}), false);
		}
	}

	namespace Video {
		let videoView: Electron.WebviewTag = null;
		let videoPromise: Promise<Electron.WebviewTag> = null;

		export function getView(): Promise<Electron.WebviewTag> {
			return new Promise((resolve) => {
				if (videoView) {
					resolve(videoView);	
				} else {
					videoPromise.then(resolve);
				}
			});
		}

		export async function setup() {
			videoPromise = initView('youtubeSubsVideoView');
			console.log(videoPromise);
			videoView = await videoPromise;
			console.log(videoPromise, videoView);

			window.setTimeout(() => {
				Helpers.addContentScripts(videoView, [{
					name: 'js',
					matches: ['*://www.youtube.com/*'],
					js: {
						files: [
							'genericJs/keypress.js'
						]
					},
					run_at: 'document_end'
				}, {
					name: 'css',
					matches: ['*://www.youtube.com/*'],
					css: {
						files: [
							'youtube/content/content.css',
							'youtubeSubs/video/youtubeVideo.css'
						]
					},
					run_at: 'document_start'
				}]);

				videoView.addEventListener('did-finish-load', () => {
					window.setTimeout(() => {
						Helpers.hacksecute(videoView, () => {
							const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
							const playerApi = document.getElementById('player-api');
							const volumeBar = document.createElement('div');
							const volumeBarBar = document.createElement('div');
							const volumeBarNumber = document.createElement('div');
							let volumeBarTimeout: number = null;

							volumeBar.id = 'yt-ca-volumeBar';
							volumeBarBar.id = 'yt-ca-volumeBarBar';
							volumeBarNumber.id = 'yt-ca-volumeBarNumber';

							volumeBar.appendChild(volumeBarNumber);
							volumeBar.appendChild(volumeBarBar);
							document.body.appendChild(volumeBar);

							console.log('Preparing your boy');
							function prepareVideo() {
								setTimeout(() => {							
									function reloadIfAd() {
										if (player.getAdState() === 1) {
											window.location.reload();
										}
										console.log('Preparing your boy');

										if (player.getPlayerState() === 3) {
											window.setTimeout(reloadIfAd, 250);
										} else {
											player.setPlaybackQuality('hd1080');
											if (player.getPlaybackQuality() !== 'hd1080') {
												player.setPlaybackQuality('hd720');
											}
											
											if (document.querySelector('.ytp-size-button')
													.getAttribute('title') === 'Theatermodus') {
												player.setSizeStyle(true, true);
											}

											localStorage.setItem('loaded', 'ytmusic');
										}
									}
									reloadIfAd();
								}, 2500);
							}

							prepareVideo();

							document.body.addEventListener('keydown', (e) => {
								if (e.key === 'k') {
									//Hide or show video
									document.body.classList.toggle('showHiddens');
								}
							});

							function updateSizes() {
								playerApi.style.width = window.innerWidth + 'px';
								playerApi.style.height = (window.innerHeight - 15) + 'px';

								player.setSize();
							}

							updateSizes();
							window.addEventListener('resize', updateSizes);

							function setPlayerVolume(volume: number) {
								player.setVolume(volume);

								localStorage.setItem('yt-player-volume', JSON.stringify({
									data: JSON.stringify({
										volume: volume,
										muted: (volume === 0)
									}),
									creation: Date.now(),
									expiration: Date.now() + (30 * 24 * 60 * 60 * 1000) //30 days
								}));
							}

							//Code that has to be executed "inline"
							function increaseVolume() {
								let vol = player.getVolume();
								if (player.isMuted()) {
									//Treat volume as 0
									vol = 0;
									player.unMute();
								}

								vol += 5;
								vol = (vol > 100 ? 100 : vol);
								setPlayerVolume(vol);
							}

							function lowerVolume() {
								let vol = player.getVolume();
								if (!player.isMuted()) {
									vol -= 5;
									
									vol = (vol < 0 ? 0 : vol);
									setPlayerVolume(vol);
								}
							}

							function showVolumeBar() {
								const volume = player.getVolume();
								localStorage.setItem('volume', volume + '');
								volumeBarNumber.innerHTML = volume + '';
								volumeBarBar.style.transform = `scaleX(${volume / 100})`;
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

							function addListeners() {
								window.onwheel = (e) => {
									onScroll(e.deltaY > 0);
								};
							}

							addListeners();
						});
					}, 2500);
				});
			}, 10);
		}
	}

	namespace SubBox {
		let subBoxView: Electron.WebviewTag = null;
		let subBoxPromise: Promise<Electron.WebviewTag> = null;

		export function getView(): Promise<Electron.WebviewTag> {
			return new Promise((resolve) => {
				if (subBoxView) {
					resolve(subBoxView);	
				} else {
					subBoxPromise.then(resolve);
				}
			});
		}

		export async function setup() {
			subBoxPromise = initView('youtubeSubsSubBoxView');
			subBoxView = await subBoxPromise;

			window.setTimeout(() => {
				Helpers.addContentScripts(subBoxView, [{
					name: 'js',
					matches: ['*://www.youtube.com/*'],
					js: {
						files: [
							'genericJs/comm.js',
							'genericJs/keypress.js',
							'youtubeSubs/subBox/subBox.js'
						]
					},
					run_at: 'document_end'
				}, {
					name: 'css',
					matches: ['*://www.youtube.com/*'],
					css: {
						files: ['youtubeSubs/subBox/subBox.css']
					},
					run_at: 'document_start'
				}]);
			}, 10);
		}
	}

	async function showVideo() {
		$('#youtubeSubsCont').classList.add('showVideo');
		(await Video.getView()).focus();
	}

	export async function changeVideo(url: string) {
		(await Video.getView()).loadURL(url)
		showVideo();
	}

	export async function setup() {
		console.log('Starting');
		await Promise.all([
			SubBox.setup(),
			Video.setup()
		]);
	}

	export function init() {
		console.log('Initting');
		window.setTimeout(async () => {
			(await SubBox.getView()).loadURL('http://www.youtube.com/feed/subscriptions');
		}, 15);
	}

	export function onClose() {
		//Nothing really
	}

	export async function onFocus() {
		if ($('#youtubeSubsCont').classList.contains('showVideo')) {
			(await Video.getView()).focus();
		} else {
			(await SubBox.getView()).focus();
		}
	}

	export async function getView(): Promise<Electron.WebviewTag> {
		if ($('#youtubeSubsCont').classList.contains('showVideo')) {
			return (await Video.getView());
		} else {
			return (await SubBox.getView());
		}
	}

	export async function onKeyPress(event: MappedKeyboardEvent): Promise<boolean> {
		if (AppWindow.getActiveViewName() !== 'youtubeSubscriptions') {
			return false;
		}

		const subsCont = $('#youtubeSubsCont');
		if (event.key === 'h') {
			if (subsCont.classList.contains('showVideo')) {
				subsCont.classList.remove('showVideo');
				(await SubBox.getView()).focus();
			} else {
				subsCont.classList.add('showVideo');
				(await Video.getView()).focus();
			}
			return true;
		} else if (event.key === 'd') {
			if (subsCont.classList.contains('showVideo')) {
				Helpers.downloadVideo((await Video.getView()).src)
				return true;
			}
		}
		return false;
	}
}

namespace YoutubeSearch {
	let activePage: 'video'|'results' = 'results';

	function initView(): Promise<Electron.WebviewTag> {
		return new Promise<Electron.WebviewTag>((resolve) => {
			const view = $(`#youtubeSearchVideoView`) as Electron.WebviewTag;
			view.addEventListener('dom-ready', () => {
				view.addEventListener('new-window', (e) => {
					shell.openExternal(e.url);
				});
				
				resolve(view);
			});
		});
	}

	export namespace Commands {
		export async function lowerVolume() {
			Helpers.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				let vol = player.getVolume();
				if (!player.isMuted()) {
					vol -= 5;
					
					vol = (vol < 0 ? 0 : vol);
					player.setVolume(vol);
				}
			});
		}

		export async function raiseVolume() {
			Helpers.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				let vol = player.getVolume();
				if (player.isMuted()) {
					//Treat volume as 0
					vol = 0;
					player.unMute();
				}

				vol += 5;
				vol = (vol > 100 ? 100 : vol);
				player.setVolume(vol);
			});
		}

		export async function togglePlay() {
			Helpers.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				const state = player.getPlayerState();
				if (state === 2) {
					//Paused
					player.playVideo();
				} else if (state === 1) {
					//Playing
					player.pauseVideo();
				} else {
					//???
				}
			});
		}

		export async function pause() {
			Helpers.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				player.pauseVideo();
			});
		}

		export async function play() {
			Helpers.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				player.playVideo();
			});
			if ((await Video.getView()).src) {
				showVideo();
			}
		}

		export function magicButton() { }
	}

	export namespace Video {
		let videoView: Electron.WebviewTag = null;
		let videoPromise: Promise<Electron.WebviewTag> = null;

		export async function getView(): Promise<Electron.WebviewTag> {
			return new Promise<Electron.WebviewTag>((resolve) => {
				if (videoView) {
					resolve(videoView);
				} else {
					videoPromise.then(resolve);
				}
			});
		}

		export async function setup() {
			videoPromise = initView();
			videoView = await videoPromise;

			window.setTimeout(() => {
				Helpers.addContentScripts(videoView, [{
					name: 'js',
					matches: ['*://www.youtube.com/*'],
					js: {
						files: [
							'genericJs/keypress.js'
						]
					},
					run_at: 'document_end'
				}, {
					name: 'css',
					matches: ['*://www.youtube.com/*'],
					css: {
						files: [
							'youtube/content/content.css',
							'youtubeSubs/video/youtubeVideo.css'
						]
					},
					run_at: 'document_start'
				}]);

				videoView.addEventListener('did-finish-load', () => {
					Helpers.hacksecute(videoView, () => {
						function getPlayer() {
							return new Promise<YoutubeVideoPlayer>((resolve) => {
								const timer = window.setInterval(() => {
									if (document.querySelector('.html5-video-player')) {
										resolve(document.querySelector('.html5-video-player') as YoutubeVideoPlayer);
										window.clearInterval(timer);
									}
								}, 500);
							});
						}

						(async () => {
							const player: YoutubeVideoPlayer = await getPlayer();
							const playerApi = document.getElementById('player-api');
							const volumeBar = document.createElement('div');
							const volumeBarBar = document.createElement('div');
							const volumeBarNumber = document.createElement('div');
							let volumeBarTimeout: number = null;

							volumeBar.id = 'yt-ca-volumeBar';
							volumeBarBar.id = 'yt-ca-volumeBarBar';
							volumeBarNumber.id = 'yt-ca-volumeBarNumber';

							volumeBar.appendChild(volumeBarNumber);
							volumeBar.appendChild(volumeBarBar);
							document.body.appendChild(volumeBar);

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
											
											if (document.querySelector('.ytp-size-button')
													.getAttribute('title') === 'Theatermodus') {
												player.setSizeStyle(true, true);
											}

											localStorage.setItem('loaded', 'ytmusic');
										}
									}
									reloadIfAd();
								}, 2500);
							}

							prepareVideo();

							document.body.addEventListener('keydown', (e) => {
								if (e.key === 'k') {
									//Hide or show video
									document.body.classList.toggle('showHiddens');
								}
							});

							function updateSizes() {
								playerApi.style.width = window.innerWidth + 'px';
								playerApi.style.height = (window.innerHeight - 15) + 'px';

								player.setSize();
							}

							updateSizes();
							window.addEventListener('resize', updateSizes);

							function setPlayerVolume(volume: number) {
								player.setVolume(volume);

								localStorage.setItem('yt-player-volume', JSON.stringify({
									data: JSON.stringify({
										volume: volume,
										muted: (volume === 0)
									}),
									creation: Date.now(),
									expiration: Date.now() + (30 * 24 * 60 * 60 * 1000) //30 days
								}));
							}

							//Code that has to be executed "inline"
							function increaseVolume() {
								let vol = player.getVolume();
								if (player.isMuted()) {
									//Treat volume as 0
									vol = 0;
									player.unMute();
								}

								vol += 5;
								vol = (vol > 100 ? 100 : vol);
								setPlayerVolume(vol);
							}

							function lowerVolume() {
								let vol = player.getVolume();
								if (!player.isMuted()) {
									vol -= 5;
									
									vol = (vol < 0 ? 0 : vol);
									setPlayerVolume(vol);
								}
							}

							function showVolumeBar() {
								const volume = player.getVolume();
								localStorage.setItem('volume', volume + '');
								volumeBarNumber.innerHTML = volume + '';
								volumeBarBar.style.transform = `scaleX(${volume / 100})`;
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

							function addListeners() {
								window.onwheel = (e) => {
									onScroll(e.deltaY > 0);
								};
							}

							addListeners();
						})();
					});
				});
			}, 10);
		}

		export function navTo(url: string) {
			videoView.loadURL(url);
			showVideo();
		}
	}

	namespace SearchResultsPage {
		let searchResultsView: Electron.WebviewTag = null;
		let searchResultsPromise: Promise<Electron.WebviewTag> = null;

		export async function getView(): Promise<Electron.WebviewTag> {
			return new Promise<Electron.WebviewTag>((resolve) => {
				if (searchResultsView) {
					resolve(searchResultsView);
				} else {
					searchResultsPromise.then(resolve);
				}
			});
		}

		export async function setup() {
			searchResultsPromise = initView();
			searchResultsView = await searchResultsPromise;
			searchResultsView.id = 'youtubeSearchResultsView';

			window.setTimeout(() => {
				Helpers.addContentScripts(searchResultsView, [{
					name: 'js',
					matches: ['*://www.youtube.com/*'],
					js: {
						files: [
							'genericJs/comm.js',
							'genericJs/keypress.js',
							'youtubeSearch/results/results.js'
						]
					},
					run_at: 'document_end'
				}, {
					name: 'css',
					matches: ['*://www.youtube.com/*'],
					css: {
						files: ['youtubeSearch/results/results.css']
					},
					run_at: 'document_start'
				}]);

				// searchResultsView.request.onBeforeRequest.addListener((details) => {
				// 	return {
				// 		cancel: details.url.indexOf('watch') > -1
				// 	}
				// }, {
				// 	urls: ['*://*/*']
				// }, ['blocking']);
			}, 10);
		}

		export function navTo(url: string) {
			searchResultsView.loadURL(url);
		}
	}

	namespace SearchBar {
		let searchBarView: Electron.WebviewTag = null;
		let searchBarPromise: Promise<Electron.WebviewTag> = null;

		export async function getView(): Promise<Electron.WebviewTag> {
			return new Promise<Electron.WebviewTag>((resolve) => {
				if (searchBarView) {
					resolve(searchBarView);
				} else {
					searchBarPromise.then(resolve);
				}
			});
		}

		export async function setup() {
			searchBarPromise = initView();
			searchBarView = await searchBarPromise;

			Helpers.addContentScripts(searchBarView, [{
				name: 'js',
				matches: ['*://www.youtube.com/*'],
				js: {
					files: [
						'genericJs/comm.js',
						'genericJs/keypress.js'
					]
				},
				run_at: 'document_end'
			}, {
				name: 'css',
				matches: ['*://www.youtube.com/*'],
				css: {
					files: ['youtubeSearch/searchBar/searchBar.css']
				},
				run_at: 'document_start'
			}]);

			searchBarView.addEventListener('load-commit', (e) => {
				if (e.isMainFrame) {
					searchBarView.stop();
					SearchResultsPage.navTo(e.url);
					if (activePage === 'video') {
						$('#youtubeSearchCont').classList.remove('showVideo');
					}
				}
			});

			(searchBarView as any).addEventListener('focus', () => {
				$('#youtubeSearchCont').classList.remove('shortenSearchBarArea');
			});
			(searchBarView as any).addEventListener('blur', () => {
				$('#youtubeSearchCont').classList.add('shortenSearchBarArea');
			});
		}

		export function toggle() {
			if (activePage === 'video') {
				$('#youtubeSearchCont').classList.toggle('searchHidden');
				return true;
			}
			return false;
		}

		export function show() {
			if (activePage === 'video') {
				$('#youtubeSearchCont').classList.remove('searchHidden');
				return true;
			}
			return false;
		}

		export function hide() {
			if (activePage === 'video') {
				$('#youtubeSearchCont').classList.add('searchHidden');
				return true;
			}
			return false;
		}

		export function focus(key?: string) {
			show();
			searchBarView.focus();
			Helpers.hacksecute(searchBarView, (REPLACE) => {
				const input = document.getElementById('masthead-search-term') as HTMLInputElement;
				input.value = input.value + REPLACE.key;
				input.focus();
			}, {
				key: JSON.stringify(key || '')
			});
		}
	}

	async function showVideo() {
		activePage = 'video';
		$('#youtubeSearchCont').classList.add('showVideo');
		SearchBar.hide();
		(await Video.getView()).focus();
	}

	export async function changeVideo(url: string) {
		(await Video.getView()).loadURL(url);
		showVideo();
	}

	export async function setup() {
		return Promise.all([
			SearchBar.setup(),
			SearchResultsPage.setup(),
			Video.setup()
		]);
	}

	export async function init() {
		window.setTimeout(async () => {
			SearchResultsPage.navTo('https://www.youtube.com/');
			(await SearchBar.getView()).loadURL('https://www.youtube.com/');
		}, 15);
	}

	export function onClose() {
		$('#titleBarLeft').style.width = 'calc(50vw)';
		$('#titleBarRight').style.width = 'calc(50vw)';
	}

	export async function onFocus() {
		if (activePage === 'video') {
			(await Video.getView()).focus();
		} else {
			(await SearchBar.getView()).focus();
		}

		$('#titleBarLeft').style.width = 'calc(50vw - 335px)';
		$('#titleBarRight').style.width = 'calc(50vw - 335px)';
	}

	export async function getView(): Promise<Electron.WebviewTag> {
		if (activePage === 'video') {
			return Video.getView();
		} else {
			return SearchResultsPage.getView();
		}
	}

	export async function onKeyPress(event: MappedKeyboardEvent): Promise<boolean> {
		if (AppWindow.getActiveViewName() !== 'youtubesearch') {
			return false;
		}

		if (event.key === 'h') {
			const subsCont = $('#youtubeSearchCont');
			if (activePage === 'video') {
				subsCont.classList.remove('showVideo');
				activePage = 'results';
				(await SearchResultsPage.getView()).focus();
			} else {
				subsCont.classList.add('showVideo');
				activePage = 'video';
				(await Video.getView()).focus();
			}
			return true;
		}
		if (event.key === 's' && SearchBar.toggle()) {
			return true;
		}
		if (event.key === 'd' && activePage === 'video') {
			//Get current video URL and download it
			Helpers.downloadVideo((await Video.getView()).src)
			return true;
		}
		if (VALID_INPUT.indexOf(event.key) > -1 && 
			!event.altKey && !event.ctrlKey) {
				SearchBar.focus(event.key);
				return true;
			}
		if (event.key === 'Tab') {
			SearchBar.focus();
		}
		return false;
	}

	export async function onSearchBarFocus() {
		if (AppWindow.getActiveViewName() === 'youtubesearch' && (await SearchBar.getView())) {
			(await SearchBar.getView()).focus();
			Helpers.hacksecute((await SearchBar.getView()), () => {
				document.getElementById('masthead-search-term').focus();
			});
		}
	}

	export async function onPaste(data: string) {
		const reg = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9]\.[^\s]{2,})/;
		if (reg.exec(data)) {
			if (AppWindow.getActiveViewName() === 'youtubesearch' && (await Video.getView())) {
				Video.navTo(data);
			} else {
				//Go to that view and focus the video
				AppWindow.switchToview('youtubesearch');
				const interval = window.setInterval(async () => {
					if (AppWindow.loadedViews.indexOf('youtubesearch') > -1 && (await Video.getView())) {
						//It's loaded
						window.clearInterval(interval);

						Video.navTo(data);
					}
				}, 50);
			}
		}			
	}
}

export interface MessageReasons {
	isMinimized: boolean;
	isFullscreen: boolean;
	isMaximized: boolean;

	onFullscreened: void;
	onMaximized: void;
	onRestored: void;
	onMinimized: void;

	restore: void;
	exitFullscreen: void;
	enterFullscreen: void;
	minimize: void;
	maximize: void;
	close: void;
}

export interface PassedAlongMessages {
	loadingCompleted: {
		view: ViewNames;
	};
	taskResult: {
		result: any;
		name: string;
		id: number;
	};
	saveUrl: {
		url: string;
	};
	keyPress: MappedKeyboardEvent;
	paste: string;
}

namespace AppWindow {
	const titleBar = document.querySelector('#titleBar');
	let activeView: ViewNames = null;
	
	type AppEvent = 'onFullscreened'|'onMaximized'|'onRestored'|'onMinimized';
	
	const listeners: Array<{
		event: AppEvent;
		callback: () => void;
	}> = [];
	export function listen(event: AppEvent, callback: () => void) {
		listeners.push({
			event: event,
			callback: callback
		});
	}

	function fireEvent(event: AppEvent) {
		listeners.filter((listener) => {
			return listener.event === event;
		}).forEach((listener) => {
			listener.callback();
		});
	}

	type ViewTypes = typeof YoutubeMusic | typeof Netflix | typeof YoutubeSubscriptions | typeof YoutubeSearch;
	export function getViewByName(name: ViewNames): ViewTypes;
	export function getViewByName(name: 'ytmusic'): typeof YoutubeMusic;
	export function getViewByName(name: 'netflix'): typeof Netflix;
	export function getViewByName(name: 'youtubeSubscriptions'): typeof YoutubeSubscriptions;
	export function getViewByName(name: 'youtubesearch'): typeof YoutubeSearch;
	export function getViewByName(name: ViewNames): ViewTypes {
		switch (name) {
			case 'ytmusic':
				return YoutubeMusic;
			case 'netflix':
				return Netflix;
			case 'youtubeSubscriptions':
				return YoutubeSubscriptions;
			case 'youtubesearch':
				return YoutubeSearch;
		}
	}

	namespace Exiting {
		let escapePresses = 0;
		export function handleEscapePress() {
			escapePresses++;
			if (escapePresses >= 3) {
				//Close app
				YoutubeMusic.onClose();
				Netflix.onClose();
				YoutubeSubscriptions.onClose();

				window.setTimeout(() => {
					window.close();
				}, 0);
				return;
			}

			window.setTimeout(() => {
				//Remove it from the array
				escapePresses--; 	
			}, 1000);
		}
	}

	function createEventLoop(name: AppEvent, cb: () => void) {
		sendBackgroundPageMessage(name).then(() => {
			cb();
			createEventLoop(name, cb);
		});
	}

	function prepareEventListeners() {
		const events: Array<AppEvent> = ['onFullscreened', 'onMaximized', 'onRestored', 'onMinimized'];
		events.forEach((eventName) => {
			sendBackgroundPageMessage(eventName).then(() => {
				createEventLoop(eventName, () => {
					fireEvent(eventName);
				});
			})
		});
	}

	async function updateButtonsState() {
		titleBar.classList[await sendBackgroundPageMessage('isMaximized') ? 'add' : 'remove']('maximized');
		titleBar.classList[await sendBackgroundPageMessage('isFullscreen') ? 'add' : 'remove']('fullscreen');
	}

	function setupListeners() {
		listen('onMaximized', updateButtonsState);
		listen('onFullscreened', updateButtonsState);
		listen('onRestored', updateButtonsState);
		window.addEventListener('focus', () => {
			titleBar.classList.add('focused');
			onFocus();
		});
		window.addEventListener('blur', () => {
			titleBar.classList.remove('focused');
		});

		document.querySelector('#fullscreen').addEventListener('click', async (e: MouseEvent) => {
			sendBackgroundPageMessage(await sendBackgroundPageMessage('isFullscreen') ?
				'exitFullscreen' : 'enterFullscreen');
			e.stopPropagation();
		});
		document.querySelector('#minimize').addEventListener('click', async (e: MouseEvent) => {
			sendBackgroundPageMessage('minimize');
			e.stopPropagation();
		});
		document.querySelector('#maximize').addEventListener('click', async (e: MouseEvent) => {
			sendBackgroundPageMessage(await sendBackgroundPageMessage('isMaximized') ?
				'restore' : 'maximize')
			e.stopPropagation();
		});
		document.querySelector('#close').addEventListener('click', (e: MouseEvent) => {
			YoutubeMusic.onClose();
			Netflix.onClose();
			YoutubeSubscriptions.onClose();

			window.setInterval(() => {
				sendBackgroundPageMessage('close');
			}, 0);
			e.stopPropagation();
		});

		titleBar.addEventListener('click', () => {
			if (activeView === 'youtubesearch') {
				YoutubeSearch.onSearchBarFocus();
			}
		});
	}

	function addRuntimeListeners() {
		//TODO: this
		// chrome.runtime.onMessage.addListener(function (message: {
		// 	cmd: string
		// }) {
		// 	const activeViewView = getActiveViewClass().Commands;
		// 	switch (message.cmd) {
		// 		case 'lowerVolume':
		// 			activeViewView.lowerVolume();
		// 			break;
		// 		case 'raiseVolume':
		// 			activeViewView.raiseVolume();
		// 			break;
		// 		case 'pausePlay':
		// 			activeViewView.togglePlay();
		// 			break;
		// 		case 'pause':
		// 			activeViewView.pause();
		// 			break;
		// 		case 'play':
		// 			activeViewView.play();
		// 			break;
		// 	}
		// });
	}

	function showSpinner() {
		$('#spinner').classList.add('active');
		$('#spinnerCont').classList.remove('hidden');
	}
	
	function hideSpinner() {
		$('#spinnerCont').classList.add('hidden');
		$('#spinner').classList.remove('active');
	}

	function handleKeyboardEvent(event: MappedKeyboardEvent) {
		if (event.key === 'Escape') {
			const youtubeSearchPageView = $('#youtubeSearchPageView');
			if (youtubeSearchPageView.style.display === 'block') {
				youtubeSearchPageView.style.display = 'none';
				return;
			}

			Exiting.handleEscapePress();
		} else if (event.key === 'F11') {
			sendBackgroundPageMessage('isFullscreen').then((isFullscreen) => {
				sendBackgroundPageMessage(isFullscreen ? 'exitFullscreen' : 'enterFullscreen');
			});
		} else if (event.key === 'F1') {
			switchToview('youtubeSubscriptions');
		} else if (event.key === 'F2') {
			switchToview('ytmusic');
		} else if (event.key === 'F3') {
			switchToview('youtubesearch');
		} else if (event.key === 'F4') {
			switchToview('netflix');
		}
	}

	export const loadedViews: Array<ViewNames> = [];
	export function onLoadingComplete(view: ViewNames) {
		loadedViews.push(view);
		if (activeView === view) {
			//Wait for the JS/CSS to apply
			window.setTimeout(() => {
				hideSpinner();
			}, 500);
		} else {
			getViewByName(view).Commands.pause();
		}
	}

	export function onMagicButton() {
		if (getActiveViewName() === 'youtubeSubscriptions') {
			YoutubeSubscriptions.Commands.magicButton();
		}
	}

	export function switchToview(view: ViewNames, first: boolean = false) {
		if (view === activeView && !first) {
			return;
		} 

		if (!first) {
			//Pause current view
			getActiveViewClass().Commands.pause();
		}

		if (loadedViews.indexOf(view) === -1) {
			showSpinner();
			getViewByName(view).init();
		} else {
			hideSpinner();
		}

		activeView = view;
		getActiveViewClass().onFocus();
		getActiveViewClass().Commands.play();
		const viewsEl = $('#views');
		viewsEl.classList.remove('ytmusic', 'netflix', 'youtubeSubscriptions', 'youtubesearch');
		viewsEl.classList.add(view);
	}

	export async function init(startView: ViewNames) {
		activeView = startView;

		listenForMessages();
		prepareEventListeners();
		setupListeners();
		addRuntimeListeners();
		await Promise.all([
			YoutubeMusic.setup(),
			Netflix.setup(),
			YoutubeSubscriptions.setup(),
			YoutubeSearch.setup()
		]);

		switchToview(startView, true);

		window.addEventListener('keydown', (e) => {
			handleKeyboardEvent(e as MappedKeyboardEvent)
		});
	}

	export function getActiveViewName(): ViewNames {
		return activeView;
	}

	export function getActiveViewClass(): ViewTypes {
		return getViewByName(getActiveViewName());
	}

	export async function getActiveViewView(): Promise<Electron.WebviewTag> {
		return await AppWindow.getActiveViewClass().getView();
	}

	export function onFocus() {
		getActiveViewClass().onFocus();
	}

	export function onKeyPress(event: MappedKeyboardEvent) {
		console.log('Some key was pressed');
		getActiveViewClass().onKeyPress(event)
	}

	const channels: Array<{
		identifier: string;
		fn: (data: MessageReasons[keyof MessageReasons]) => void
	}> = [];

	function genRandomString(): string {
		const possibleLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let str = '';
		for (let i = 0; i < 100; i++) {
			str += possibleLetters.charAt(Math.floor(Math.random() * possibleLetters.length));
		}

		return str;
	}

	function genIdentifier(): string {
		let str: string = null;
		do {
			str = genRandomString();
		} while (channels.filter((val) => {
			return val.identifier === str;
		}).length > 0)

		return str;
	}

	function saveURL(url: string) {
		const db = firebase.database()
		const ref = db.ref('url');
		ref.update({
			url: url
		});
	}

	function listenForMessages() {
		ipcRenderer.on('fromBgPage', (event: Event, message: {
			identifier: string;
			data: MessageReasons[keyof MessageReasons]
		}) => {
			const identifier = message.identifier;
			channels.filter((val) => {
				return val.identifier === identifier
			}).forEach((val) => {
				val.fn(message.data);
				channels.splice(channels.indexOf(val), 1);
			});
		});
		ipcRenderer.on('passedAlong', <T extends keyof PassedAlongMessages>(event: Event, message: {
			type: T;
			data: PassedAlongMessages[T]
		}) => {
			const { type, data } = message;
			switch (type) {
				case 'loadingCompleted':
					onLoadingComplete((data as PassedAlongMessages['loadingCompleted']).view);
					break;
				case 'taskResult':
					const res = data as PassedAlongMessages['taskResult'];
					Helpers.returnTaskValue(res.result, res.id);
					break;
				case 'saveUrl':
					const saveUrlRes = data as PassedAlongMessages['saveUrl'];
					saveURL(saveUrlRes.url);
					break;
				case 'keyPress':
					const keyPressRes = data as PassedAlongMessages['keyPress'];
					onKeyPress(keyPressRes);
					break;
				case 'paste':
					const pasteData = data as PassedAlongMessages['paste'];
					YoutubeSearch.onPaste(pasteData);
					break;
			}
		});
	}

	export async function sendBackgroundPageMessage<T extends keyof MessageReasons>(reason: T): Promise<MessageReasons[T]> {
		const identifier = genIdentifier();
		return new Promise<MessageReasons[T]>((resolve) => {
			channels.push({
				identifier: identifier,
				fn: (data) => {
					resolve(data);
				}
			});
			ipcRenderer.send('toBgPage', {
				identifier: identifier,
				type: reason,
			});
		});
	}
}

AppWindow.init('ytmusic');
window.Helpers = Helpers;
window.Netflix = Netflix;
window.AppWindow = AppWindow;
window.YoutubeMusic = YoutubeMusic;
window.YoutubeSubscriptions = YoutubeSubscriptions;