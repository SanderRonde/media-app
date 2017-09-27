import { Helpers, $ } from '../libs/helpers'
import { FireBaseConfig, getSecret } from '../libs/getSecrets'
import { AppWindow } from './appWindow'
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
			Helpers.hacksecute(view, (REPLACE) => {
				if ((window as any).executedYTCA) {
					return;
				}
				(window as any).executedYTCA = location.href;

				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;				

				REPLACE.playPauseListeners();
				REPLACE.volumeManager(player);
				const setupVisualizer = REPLACE.handleVisualizer();
				REPLACE.initialSizing(player, 'ytmusic', setupVisualizer);
				REPLACE.handleResize(player);
				REPLACE.handleToggleHiddens('h');
				REPLACE.handleYoutubeMusicTasks();
				REPLACE.adSkipper();
			}, {
				volumeManager: Helpers.YoutubeVideoFunctions.volumeManager,
				playPauseListeners: Helpers.YoutubeVideoFunctions.playPauseListeners,
				initialSizing: Helpers.YoutubeVideoFunctions.initialSizing,
				handleResize: Helpers.YoutubeVideoFunctions.handleResize,
				handleToggleHiddens: Helpers.YoutubeVideoFunctions.handleToggleHiddens,
				handleVisualizer: Helpers.YoutubeVideoFunctions.handleVisualizer,
				handleYoutubeMusicTasks: Helpers.YoutubeVideoFunctions.handleYoutubeMusicTasks,
				adSkipper: Helpers.YoutubeVideoFunctions.adSkipper
			});
		}
	}

	namespace Downloading {
		let songFoundTimeout: number = null;
		let songFoundName = '';
		export function downloadSong() {
			//Search for it on youtube
			const downloadSongView = $('#youtubeSearchPageView') as Electron.WebviewTag;

			downloadSongView.style.display = 'block';
			Helpers.addContentScripts(downloadSongView, [{
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
				const websiteWebview = await Helpers.createWebview({
					id: '1001TracklistsView',
					parentId: '1001tracklistsContainer',
					partition: 'tracklists'
				});;
				let currentPage: 'main'|'results'|'none' = 'none';
				Helpers.addContentScripts(websiteWebview, [{
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
				websiteWebview.addEventListener('dom-ready', () => {
					if (currentPage === 'none') {
						currentPage = 'main';
					} else if (currentPage === 'main') {
						currentPage = 'results';
					}

					if (currentPage === 'main') {
						Helpers.sendTaskToPage(JSON.stringify([
							'searchFor', name
						]), '1001tracklists', () => { });
					} else if (currentPage === 'results') {
						Helpers.sendTaskToPage(JSON.stringify([
							'findItem', url
						]), '1001tracklists', (result: false|string) => {
							if (result !== 'null' && result !== 'false' && result) {
								getTrackFrom1001TracklistsUrl(result);
							} else {
								resolve(false);
							}
							websiteWebview.remove();
						});
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
				data: number[]|string
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
							Helpers.showToast('Could not find the current song 😞');
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
			Helpers.hacksecute(view, () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				player && player.playVideo();
			});
		}

		export async function setup() {
			viewPromise = Helpers.createWebview({
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
				
				Helpers.sendIPCMessage('toBgPage', {
					type: 'passAlong',
					data: {
						type: 'saveUrl',
						data: {
							url: url
						}
					} as PassedAlongMessage<'saveUrl'>
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
				Helpers.hacksecute(view, () => {
					document.body.classList.toggle('showVisualizer');
				});
				return true;
			} else if (event.key === '?') {
				YoutubeMusic.getCurrentSong();
				return true;
			} else if (event.key === 'r') {
				(await getView()).reload();
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
			return await Helpers.execute(vidView, () => {
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
		Helpers.addContentScripts(view, [{
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

	export function saveURL(url: string) {
		Firebase.store('url', url);
	}
}