import { Helpers, $, MappedKeyboardEvent } from './helpers'
import { AppWindow } from './appWindow'
import { shell } from 'electron'

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

				function doTempInterval(fn: () => void, interval: number, max: number) {
					const intervalId = window.setInterval(fn, interval);
					window.setTimeout(() => {
						window.clearInterval(intervalId);
					}, max);
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
									
									doTempInterval(() => {
										player.setSizeStyle(false, true);
									}, 250, 5000);
									setupVisualizer();
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
				files: [
					'youtube/content/content.css',
					'youtube/content/youtubeVideo.css'
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
	}

	function launch(url: string) {
		//TODO: change this lol
		view.loadURL('https://www.youtube.com/watch?v=ih-NNLjTCPs&list=WL&index=804&t=1260');
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
			(await YoutubeMusic.getView()).reload();
		}
		return false;
	}
}