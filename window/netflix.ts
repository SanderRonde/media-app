import { Helpers, EXAMPLE_STYLES, MappedKeyboardEvent } from './helpers'
import { AppWindow } from './appWindow'

export namespace Netflix {
	function initView(): Promise<Electron.WebviewTag> {
		return new Promise((resolve) => {
			const view = document.getElementById('netflixWebView') as Electron.WebviewTag;
			view.addEventListener('dom-ready', () => {
				if (view.getURL().indexOf('example.com') > -1) {
					view.insertCSS(EXAMPLE_STYLES);
				}
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
							'netflix/video/video.js'
						]
					},
					run_at: 'document_idle'
				}]);
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

	export async function init() {
		await Helpers.wait(15);
		(await Video.getView()).loadURL('https://www.netflix.com/browse');
		await Helpers.wait(5000);
		AppWindow.onLoadingComplete('netflix');
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

	export async function onKeyPress(event: MappedKeyboardEvent) { 
		return false;
	}
}