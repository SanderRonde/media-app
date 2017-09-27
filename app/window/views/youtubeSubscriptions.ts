import { Helpers, $ } from '../libs/helpers'
import { YoutubeVideoPlayer } from './youtubeMusic'
import { AppWindow, ViewNames } from './appWindow'

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
			(await SubBox.getView()).executeJavaScript(Helpers.inlineFn(() => {
					(window as any).videos.selected.goLeft();
					(window as any).videos.selected.launchCurrent();
				}), false);
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
						Helpers.hacksecute(videoView, (REPLACE) => {
							const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;

							REPLACE.playPauseListeners();
							REPLACE.volumeManager(player);
							REPLACE.initialSizing(player, null);
							REPLACE.handleResize(player);
							REPLACE.handleToggleHiddens('k');
							REPLACE.adSkipper();
						}, {
							volumeManager: Helpers.YoutubeVideoFunctions.volumeManager,
							playPauseListeners: Helpers.YoutubeVideoFunctions.playPauseListeners,
							initialSizing: Helpers.YoutubeVideoFunctions.initialSizing,
							handleResize: Helpers.YoutubeVideoFunctions.handleResize,
							handleToggleHiddens: Helpers.YoutubeVideoFunctions.handleToggleHiddens,
							adSkipper: Helpers.YoutubeVideoFunctions.adSkipper
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
						files: ['./window/views/youtubeSubs/subBox/subBox.css']
					},
					run_at: 'document_start'
				}, {
					name: 'googleAccJs',
					matches: [
						'*://accounts.google.com/*',
						'*://www.accounts.google.com/*'
					],
					js: {
						code: Helpers.inlineFn(() => {
							localStorage.setItem('loaded', 'youtubeSubscriptions' as ViewNames);
						})
					},
					run_at: 'document_end'
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
}