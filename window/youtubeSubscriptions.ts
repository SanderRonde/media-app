import { Helpers, $, MappedKeyboardEvent } from './helpers'
import { YoutubeVideoPlayer } from './youtubeMusic'
import { AppWindow } from './appWindow'

export namespace YoutubeSubscriptions {
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
			if ((await Video.getView()).src.indexOf('example.com') === -1) {
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

		export async function getTitle(): Promise<string> {
			return await Helpers.execute(await getView(), () => {
				return document.querySelector('.title').innerHTML;
			});
		}

		export async function setup() {
			videoPromise = Helpers.createWebview({
				id: 'youtubeSubsVideoView',
				partition: 'youtubeSubscriptions',
				parentId: 'youtubeSubsCont'
			});
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
							'youtube/content/content.css'
						]
					},
					run_at: 'document_start'
				}]);

				videoView.addEventListener('did-finish-load', () => {
					window.setTimeout(() => {
						Helpers.hacksecute(videoView, () => {
							var ipcRenderer = require('electron').ipcRenderer;

							const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
							const playerApi = document.getElementById('player-api');
							const volumeBar = document.createElement('div');
							const volumeBarBar = document.createElement('div');
							const volumeBarNumber = document.createElement('div');
							const video = document.getElementsByTagName('video')[0];
							let volumeBarTimeout: number = null;

							volumeBar.id = 'yt-ca-volumeBar';
							volumeBarBar.id = 'yt-ca-volumeBarBar';
							volumeBarNumber.id = 'yt-ca-volumeBarNumber';

							volumeBar.appendChild(volumeBarNumber);
							volumeBar.appendChild(volumeBarBar);
							document.body.appendChild(volumeBar);

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
										}
									}
									reloadIfAd();
								}, 2500);

								doTempInterval(() => {
									player.setSizeStyle(false, true);
								}, 100, 5000);
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
								video.onplay = () => {
									ipcRenderer.send('toBgPage', {
										type: 'passAlong',
										data: {
											type: 'onPlay',
											data: {
												view: 'youtubeSubscriptions'
											}
										}
									});
								}
								video.onpause = () => {
									ipcRenderer.send('toBgPage', {
										type: 'passAlong',
										data: {
											type: 'onPause',
											data: {
												view: 'youtubeSubscriptions'
											}
										}
									});
								}
							}

							addListeners();
						});
					}, 2500);
				});
			}, 10);
		}
	}

	export namespace SubBox {
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
			subBoxPromise = Helpers.createWebview({
				id: 'youtubeSubsSubBoxView',
				partition: 'youtubeSubsVideoView', 
				parentId: 'youtubeSubsCont'
			});
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
		await Helpers.wait(500);
		(await Video.getView()).focus();
		AppWindow.updateStatus(await Video.getTitle());
	}

	export async function changeVideo(url: string) {
		(await Video.getView()).loadURL(url)
		showVideo();
	}

	export async function setup() {
		await Promise.all([
			SubBox.setup(),
			Video.setup()
		]);
		await Helpers.wait(15);
		(await SubBox.getView()).loadURL('http://www.youtube.com/feed/subscriptions');
	}

	export function onClose() {
		//Nothing really
	}

	export async function onFocus() {
		if ($('#youtubeSubsCont').classList.contains('showVideo')) {
			(await Video.getView()).focus();
			AppWindow.updateStatus(await Video.getTitle());
		} else {
			(await SubBox.getView()).focus();
			AppWindow.updateStatus('Browsing subscriptions');
		}
	}

	export async function getView(): Promise<Electron.WebviewTag> {
		if ($('#youtubeSubsCont').classList.contains('showVideo')) {
			return (await Video.getView());
		} else {
			return (await SubBox.getView());
		}
	}

	export async function toggleVideoVisibility() {
		const subsCont = $('#youtubeSubsCont');
		if (subsCont.classList.contains('showVideo')) {
			subsCont.classList.remove('showVideo');
			await Helpers.wait(500);
			(await SubBox.getView()).focus();
			AppWindow.updateStatus('Browsing subscriptions');
		} else {
			subsCont.classList.add('showVideo');
			await Helpers.wait(500);
			(await Video.getView()).focus();
			AppWindow.updateStatus(await Video.getTitle());
		}
	}

	export async function onKeyPress(event: MappedKeyboardEvent): Promise<boolean> {
		if (AppWindow.getActiveViewName() !== 'youtubeSubscriptions') {
			return false;
		}

		if (event.key === 'h') {
			toggleVideoVisibility();
			return true;
		} else if (event.key === 'd') {
			if ($('#youtubeSubsCont').classList.contains('showVideo')) {
				Helpers.downloadVideo((await Video.getView()).src)
				return true;
			}
		}
		return false;
	}
}