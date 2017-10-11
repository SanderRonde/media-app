import { FireBaseConfig, getSecret } from '../libs/getSecrets'
import { MessageServer } from '../../backgroundLibs/msg/msg';
import { AppWindow, MappedKeyboardEvent } from './appWindow'
import { Util, $ } from '../libs/util'
import firebase = require('firebase');
import { shell } from 'electron';

export interface YoutubeVideoPlayer extends HTMLElement {
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
	setSizeStyle(showExpansionIcon: boolean, expanded: boolean): void;
	setSize(): void;
	getCurrentTime(): number;
	seekTo(seconds: number): void;
}

export interface YoutubeMusicWindow extends Window {
	lowerVolume(): void;
	increaseVolume(): void;
}

export namespace YoutubeMusic {
	let view: Electron.WebviewTag = null;
	let viewPromise: Promise<Electron.WebviewTag> = null;

	namespace Visualization {
		export let visualizing = false;

		export function isVisualizing() {
			return visualizing;
		}

		export function toggle() {
			visualizing = !visualizing;
		}
	}

	namespace Firebase {
		let initialized: boolean = false;

		async function getFirebaseConfig(): Promise<FireBaseConfig> {
			return await getSecret('firebaseConfig');
		}

		async function init() {
			const config = await getFirebaseConfig();
			firebase.initializeApp(config);
			initialized = true;
		}

		export async function get(key: string): Promise<string> {
			return new Promise<string>(async (resolve) => {
				if (!initialized) {
					await init();
				}

				const db = firebase.database();
				const ref = db.ref(key);
				ref.once('value', (snapshot) => {
					const snapshotVal = snapshot.val();
					if (snapshotVal && snapshotVal[key] && typeof snapshotVal[key] === 'string') {
						resolve(snapshotVal[key]);
					} else {
						require('electron').remote.dialog.showErrorBox('Error loading firebase value', 
							'Could not find valid url, quitting');
						require('electron').remote.app.quit();
						resolve(null);
					}
				});
			});
		}

		export async function store(key: string, val: string): Promise<void> {
			return new Promise<void>(async (resolve) => {
				if (!initialized) {
					await init();
				}

				if (AppWindow.isDebug()) {
					return;
				}

				const db = firebase.database()
				const ref = db.ref(key);
				ref.update({
					[key]: val
				});
			});
		}
	}

	namespace Content {
		export async function init() {
			Util.hacksecute(view, (REPLACE) => {
				if ((window as any).executedYTCA) {
					return;
				}
				(window as any).executedYTCA = location.href;

				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;				

				REPLACE.playPauseListeners('ytmusic');
				REPLACE.volumeManager(player);
				const setupVisualizer = REPLACE.handleVisualizer();
				REPLACE.initialSizing(player, 'ytmusic', setupVisualizer);
				REPLACE.handleResize(player);
				REPLACE.handleToggleHiddens('h');
				REPLACE.handleYoutubeMusicTasks();
				REPLACE.adSkipper();
			}, {
				volumeManager: Util.YoutubeVideoFunctions.volumeManager,
				playPauseListeners: Util.YoutubeVideoFunctions.playPauseListeners,
				initialSizing: Util.YoutubeVideoFunctions.initialSizing,
				handleResize: Util.YoutubeVideoFunctions.handleResize,
				handleToggleHiddens: Util.YoutubeVideoFunctions.handleToggleHiddens,
				handleVisualizer: Util.YoutubeVideoFunctions.handleVisualizer,
				handleYoutubeMusicTasks: Util.YoutubeVideoFunctions.handleYoutubeMusicTasks,
				adSkipper: Util.YoutubeVideoFunctions.adSkipper
			});
		}
	}

	namespace Downloading {
		let songFoundTimeout: number = null;
		let songFoundName = '';
		const server = new MessageServer();

		export function downloadSong() {
			//Search for it on youtube
			const downloadSongView = $('#youtubeSearchPageView') as Electron.WebviewTag;

			downloadSongView.style.display = 'block';
			Util.addContentScripts(downloadSongView, [{
				name: 'youtubeSearchJs',
				matches: ['*://www.youtube.com/*'],
				js: {
					files: ['./window/views/youtube/youtubeSearch/youtubeSearch.js', 
						'./window/libs/keypress.js']
				},
				run_at: 'document_end'
			}, {
				name: 'youtubeSearchCss',
				matches: ['*://www.youtube.com/*'],
				css: {
					files: ['./window/views/youtube/youtubeSearch/youtubeSearch.css']
				},
				run_at: "document_start"
			}]);

			downloadSongView.loadURL(`https://www.youtube.com/results?search_query=${
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

		function getSongIndex(timestamps: (number|null)[], time: number): number {
			for (let i = 0; i < timestamps.length; i++) {
				if (timestamps[i] <= time && timestamps[i + 1] >= time) {
					return i;
				}
			}
			return timestamps.length - 1;
		}

		function findOn1001Tracklists(name: string, url: string): Promise<boolean> {
			return new Promise(async (resolve) => {
				const websiteWebview = await Util.createWebview({
					id: 'thousandAndOneTracklistsView',
					parentId: 'thousandAndOneTracklistsContainer',
					partition: 'tracklists'
				});;
				let currentPage: 'main'|'results'|'none' = 'none';
				Util.addContentScripts(websiteWebview, [{
					name: 'comm',
					matches: ['*://*/*'],
					js: {
						files: [
							'./window/libs/comm.js',
							'./window/libs/keypress.js',
							'./window/views/youtube/1001tracklists/content.js'
						]
					}
				}]);
				websiteWebview.addEventListener('dom-ready', async () => {
					if (currentPage === 'none') {
						currentPage = 'main';
					} else if (currentPage === 'main') {
						currentPage = 'results';
					}

					await Util.wait(500);

					if (currentPage === 'main') {
						server.sendTask('searchFor', name, '1001tracklists');
					} else if (currentPage === 'results') {
						const result = await server.sendTask('findItem', url, '1001tracklists');
						if (result !== 'null' && result !== 'false' && result) {
							getTrackFrom1001TracklistsUrl(result).then(() => {
								resolve(true);
							});
						} else {
							resolve(false);
						}
						websiteWebview.remove();
					}
				});
				websiteWebview.src = 'https://www.1001tracklists.com';
				document.body.appendChild(websiteWebview);
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
			return getUrlHTML(url).then(async (doc) => {
				const tracks = Util.toArr(doc.querySelectorAll('.tlpTog')).map((songContainer) => {
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

				const time = await server.sendTask('getTime', void 0, 'youtube');
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
				return true;
			});
		}

		export async function getCurrentSong() {
			const timestamps = await server.sendTask('getTimestamps', void 0, 'youtube');
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
					const time = await server.sendTask('getTime', void 0, 'youtube');
					const index = getSongIndex(data, ~~time);
					const name = await server.sendTask('getSongName', index, 'youtube');
					displayFoundSong(name);
				}
			} else {
				//Look if the podcast exists on 1001tracklists
				findOn1001Tracklists(timestamps.data.name, timestamps.data.url).then((found) => {
					if (!found) {
						//Show not found toast
						Util.showToast('Could not find the current song 😞');
					}
				});
			}
		}
	}

	export function getCurrentSong() {
		Downloading.getCurrentSong();
	}
	
	export async function reload() {
		(await Commands.getView()).reload();
	}

	export namespace Commands {
		export function lowerVolume() {
			Util.hacksecute(view, () => {
				(<YoutubeMusicWindow>window).lowerVolume();
			});
		}

		export function raiseVolume() {
			Util.hacksecute(view, () => {
				(<YoutubeMusicWindow>window).increaseVolume();
			});
		}

		export function togglePlay() {
			Util.hacksecute(view, () => {
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
			Util.hacksecute(view, () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				player.pauseVideo();
			});
		}

		export function play() {
			Util.hacksecute(view, () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				player && player.playVideo();
			});
		}

		export async function setup() {
			viewPromise = Util.createWebview({
				id: 'ytmaWebview',
				partition: 'youtubeplaylist',
				parentId: 'youtubePlaylistCont'
			});
			view = await viewPromise;
			addViewListeners();
			addListeners();
	
			const url = await Firebase.get('url');
			if (url) {
				launch(url);
			}
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
				
				require('electron').ipcRenderer.send('main', {
					channel: 'toWindow',
					type: 'saveUrl',
					data: url,
					identifier: -1
				});
			}).toString()})()`, false);
		}
	
		export async function updateStatus() {
			AppWindow.updateStatus(await getTitle());
		}
	
		export async function onFocus() {
			view && view.focus();
			updateStatus();
		}
	
		export async function getView(): Promise<Electron.WebviewTag> {
			if (view) {
				return view;
			} else {
				return await viewPromise;
			}
		}
	
		export async function onKeyPress(event: MappedKeyboardEvent): Promise<boolean> {
			if (AppWindow.getActiveViewName() !== 'ytmusic') {
				return false;
			}
			if (event.key === 'd') {
				Downloading.downloadSong();
				return true;
			} else if (event.key === 'v') {
				Visualization.toggle();
				Util.hacksecute(view, () => {
					document.body.classList.toggle('showVisualizer');
				});
				return true;
			} else if (event.key === '?') {
				YoutubeMusic.getCurrentSong();
				return true;
			} else if (event.key === 'r') {
				reload();
			}
			return false;
		}

		export function free() {
			viewPromise = null;
			view && view.remove();
			view = null;
			Visualization.visualizing = false;
		}
	}

	async function getTitle(): Promise<string> {
		const vidView = await Commands.getView();
		if (vidView) {
			return await Util.execute(vidView, () => {
				try {
					return document.querySelector('h1.title').innerHTML;
				} catch(e) {
					return '?';
				}
			});
		}
		return '?';
	}

	function addViewListeners() {
		Util.addContentScripts(view, [{
			name: 'js',
			matches: ['*://www.youtube.com/*'],
			js: {
				files: [
					'./window/libs/comm.js',
					'./window/libs/keypress.js',
					'./window/views/youtube/content/content.js'
				]
			},
			run_at: 'document_end'
		}, {
			name: 'css',
			matches: ['*://www.youtube.com/*'],
			css: {
				files: [
					'./window/views/youtube/content/content.css',
					'./window/views/youtube/content/youtubeVideo.css'
				]
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

		view.addEventListener('dom-ready', async (e) => {
			AppWindow.updateStatus(await getTitle());
		});
	}

	function launch(url: string) {
		if (AppWindow.isDebug()) {
			view.loadURL('https://www.youtube.com/watch?v=ih-NNLjTCPs&list=WL&index=804&t=1260');
		} else {
			view.loadURL(url);
		}
	}

	function addListeners() {
		const server = new MessageServer();
		const eventChannel = server.channel('events');
		const toBgPageChannel = server.channel('toBgPage');

		eventChannel.on('onMinimized', () => {
			if (Visualization.isVisualizing()) {
				Util.hacksecute(view, () => {
					document.body.classList.remove('showVisualizer');
				});
			}
			return MessageServer.NO_RETURN;
		});
		eventChannel.on('onRestored', async () => {
			if (!await toBgPageChannel.send('isMinimized', null) && Visualization.isVisualizing()) {
				Util.hacksecute(view, () => {
					document.body.classList.add('showVisualizer');
				});
			}
		});
		Util.toArr(document.querySelectorAll('.toast .dismissToast')).forEach((toastButton) => {
			toastButton.addEventListener('click', () => {
				toastButton.parentNode.classList.remove('visible');
			});
		});
	}

	export function saveURL(url: string) {
		Firebase.store('url', url);
	}
}