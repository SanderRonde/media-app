import { AppWindow, MappedKeyboardEvent } from './appWindow';
import { Util } from '../libs/util';

export namespace Netflix {
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

		export function loaded() {
			return videoView !== null;
		}

		export async function getPlayStatus(): Promise<boolean> {
			return Util.execute(await getView(), () => {
				if (document.querySelector('.button-nfplayerPause')) {
					return true;
				} else {
					return false;
				}
			});
		}

		export async function getVideoTitle(): Promise<string> {
			return Util.execute(await getView(), () => {
				if (document.querySelector('.video-title')) {
					return document.querySelector('.video-title').children[0].children[0].innerHTML;
				} else {
					return 'nothing';
				}
			});
		}

		export async function setup() {
			videoPromise = Util.createWebview({
				id: 'netflixWebView',
				partition: 'netflix',
				parentId: 'netflixCont',
				nodeIntegration: false,
				plugins: true
			});
			videoView = await videoPromise;

			window.setTimeout(() => {
				Util.addContentScripts(videoView, [{
					name: 'js',
					matches: ['*://*/*'],
					js: {
						files: [
							'netflix/video/video.js'
						]
					},
					run_at: 'document_idle'
				}]);
			}, 10);
		}

		export function free() {
			videoPromise = null;
			videoView && videoView.remove();
			videoView = null;	
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
			Util.hacksecute((await Video.getView()), () => {
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
			Util.hacksecute((await Video.getView()), () => {
				const video = (document.querySelector('video') as HTMLVideoElement);
				video.pause();
			});
		}

		export async function play() {
			Util.hacksecute((await Video.getView()), () => {
				const video = (document.querySelector('video') as HTMLVideoElement);
				video.play();
			});
		}

		export async function setup() {
			await Video.setup();
			(await Video.getView()).loadURL('https://www.netflix.com/browse');
			await Util.wait(5000);
			AppWindow.onLoadingComplete('netflix');
			AppWindow.updateStatus('Watching netflix');
			initStateListener();
		}
	
		interface ClickableElement extends Element {
			click: () => void;
		}
	
		export async function onClose() {
			//Go for a semi-clean exit
			Video.loaded() && 
			(await Video.getView()).src && 
			(await Video.getView()).canGoBack() &&
			(await Video.getView()).goBack();
		}
	
		export function updateStatus() { }
	
		export async function onFocus() {
			(await Video.getView()).focus();
			AppWindow.updateStatus('Watching netflix');
		}
	
		export async function getView(): Promise<Electron.WebviewTag> {
			return (await Video.getView());
		}
	
		export async function onKeyPress(event: MappedKeyboardEvent) { 
			return false;
		}

		export function free() {
			Video.free();
			state.playing = false;
			state.title = 'nothing';
		}
	}

	const state = {
		playing: false,
		title: 'nothing'
	};

	let interval: number = null;
	function initStateListener() {
		if (interval) {
			return;
		}
		interval = window.setInterval(async () => {
			const [ playing, title ] = await Promise.all([
				Video.getPlayStatus(),
				Video.getVideoTitle()
			]);
			if (state.playing !== playing || state.title !== title) {
				AppWindow.updateStatus(state.title);
				AppWindow[playing ? 'onPlay' : 'onPause']('netflix');

				state.playing = playing;
				state.title = title;
			}
		}, 500);
	}
}