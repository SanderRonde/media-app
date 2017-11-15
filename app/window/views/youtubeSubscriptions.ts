import { AppWindow, ViewNames, MappedKeyboardEvent } from './appWindow';
import { YoutubeVideoPlayer } from './youtubeMusic';
import { Util, $, inlineFn } from '../libs/util';

export namespace YoutubeSubscriptions {
	export namespace Commands {
		export async function lowerVolume() {
			Util.hacksecute((await Video.getView()), () => {
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
			Util.hacksecute((await Video.getView()), () => {
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
			Util.hacksecute((await Video.getView()), () => {
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
			Util.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				player.pauseVideo();
			});
		}

		export async function play() {
			Util.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				player.playVideo();
			});
			if ((await Video.getView()).src.indexOf('example.com') === -1) {
				showVideo();
			}
		}

		export async function magicButton() {
			(await SubBox.getView()).executeJavaScript(inlineFn(() => {
					(window as any).videos.selected.goLeft();
					(window as any).videos.selected.launchCurrent();
				}), false);
		}

		export async function setup() {
			await Promise.all([
				SubBox.setup(),
				Video.setup()
			]);
			await Util.wait(15);
			(await SubBox.getView()).loadURL('http://www.youtube.com/feed/subscriptions');
		}

		export function onClose() {
			//Nothing really
		}
	
		export async function updateStatus() {
			if ($('#youtubeSubsCont').classList.contains('showVideo')) {
				AppWindow.updateStatus(await Video.getTitle());
			} else {
				AppWindow.updateStatus('Browsing subscriptions');
			}
		}
	
		export async function onFocus() {
			if ($('#youtubeSubsCont').classList.contains('showVideo')) {
				(await Video.getView()).focus();
			} else {
				(await SubBox.getView()).focus();
			}
			updateStatus();
		}
	
		export async function getView(): Promise<Electron.WebviewTag> {
			if ($('#youtubeSubsCont').classList.contains('showVideo')) {
				return (await Video.getView());
			} else {
				return (await SubBox.getView());
			}
		}

		export async function getYoutubeView(): Promise<Electron.WebviewTag> {
			return (await Video.getView());
		}
	
		export async function toggleVideoVisibility() {
			const subsCont = $('#youtubeSubsCont');
			if (subsCont.classList.contains('showVideo')) {
				subsCont.classList.remove('showVideo');
				await Util.wait(500);
				(await SubBox.getView()).focus();
				AppWindow.updateStatus('Browsing subscriptions');
			} else {
				subsCont.classList.add('showVideo');
				await Util.wait(500);
				(await Video.getView()).focus();
				AppWindow.updateStatus(await Video.getTitle());
			}
		}
	
		export async function onKeyPress(event: MappedKeyboardEvent): Promise<boolean> {
			if (AppWindow.getActiveViewName() !== 'youtubeSubscriptions') {
				return false;
			}
	
			if (event.key === 'h') {
				if ((await Video.getView()).getURL() === 'about:blank') {
					//Skip it
					return false;
				}
				toggleVideoVisibility();
				return true;
			} else if (event.key === 'd') {
				if ($('#youtubeSubsCont').classList.contains('showVideo')) {
					Util.downloadVideo((await Video.getView()).src);
					return true;
				}
			}
			return false;
		}

		export function free() {
			Video.free();
			SubBox.free();
			$('#youtubeSubsCont').classList.remove('showVideo');
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
			return await Util.execute(await getView(), () => {
				return document.querySelector('.title').innerHTML;
			});
		}

		export async function setup() {
			videoPromise = Util.createWebview({
				id: 'youtubeSubsVideoView',
				partition: 'youtubeSubsVideoView',
				parentId: 'youtubeSubsCont'
			});
			videoView = await videoPromise;

			window.setTimeout(() => {
				Util.addContentScripts(videoView, [{
					name: 'js',
					matches: ['*://www.youtube.com/*'],
					js: {
						files: [
							'./window/libs/keypress.js'
						]
					},
					run_at: 'document_end'
				}, {
					name: 'css',
					matches: ['*://www.youtube.com/*'],
					css: {
						files: [
							'./window/views/youtube/content/content.css'
						]
					},
					run_at: 'document_start'
				}]);

				videoView.addEventListener('did-finish-load', async () => {
					window.setTimeout(() => {
						Util.hacksecute(videoView, (REPLACE) => {
							const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;

							REPLACE.playPauseListeners('youtubeSubscriptions');
							const setGain  = REPLACE.handleVisualizer()[1];
							REPLACE.volumeManager(player, setGain);
							REPLACE.initialSizing(player, null);
							REPLACE.handleResize(player);
							REPLACE.handleToggleHiddens('k');
							REPLACE.adSkipper();
						}, {
							volumeManager: Util.YoutubeVideoFunctions.volumeManager,
							playPauseListeners: Util.YoutubeVideoFunctions.playPauseListeners,
							initialSizing: Util.YoutubeVideoFunctions.initialSizing,
							handleResize: Util.YoutubeVideoFunctions.handleResize,
							handleVisualizer: Util.YoutubeVideoFunctions.handleVisualizer,
							handleToggleHiddens: Util.YoutubeVideoFunctions.handleToggleHiddens,
							adSkipper: Util.YoutubeVideoFunctions.adSkipper
						});
					}, 2500);
				});
			}, 10);
		}

		export function free() {
			videoPromise = null;
			videoView && videoView.remove();
			videoView = null;
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
			subBoxPromise = Util.createWebview({
				id: 'youtubeSubsSubBoxView',
				partition: 'youtubeSubscriptions', 
				parentId: 'youtubeSubsCont'
			});
			subBoxView = await subBoxPromise;

			window.setTimeout(() => {
				Util.addContentScripts(subBoxView, [{
					name: 'js',
					matches: ['*://www.youtube.com/*'],
					js: {
						files: [
							'./window/libs/comm.js',
							'./window/libs/keypress.js',
							'./window/views/youtubeSubs/subBox/subBox.js'
						]
					},
					run_at: 'document_end'
				}, {
					name: 'css',
					matches: ['*://www.youtube.com/*'],
					css: {
						files: [
							'./window/views/youtubeSubs/subBox/subBox.css',
							'./window/resources/css/spinner.css'
						]
					},
					run_at: 'document_start'
				}, {
					name: 'googleAccJs',
					matches: [
						'*://accounts.google.com/*',
						'*://www.accounts.google.com/*'
					],
					js: {
						code: inlineFn(() => {
							localStorage.setItem('loaded', 'youtubeSubscriptions' as ViewNames);
						})
					},
					run_at: 'document_end'
				}]);
			}, 10);
		}

		export function free() {
			subBoxPromise = null;
			subBoxView && subBoxView.remove();
			subBoxView = null;
		}
	}

	async function showVideo() {
		$('#youtubeSubsCont').classList.add('showVideo');
		await Util.wait(500);
		(await Video.getView()).focus();
		AppWindow.updateStatus(await Video.getTitle());
	}

	export async function changeVideo(url: string) {
		(await Video.getView()).loadURL(url);
		showVideo();
	}
}