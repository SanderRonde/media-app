import { EXTERNAL_EVENT } from '../appLibs/constants/constants'
import { YoutubeSubscriptions } from './youtubeSubscriptions'
import { MappedKeyboardEvent, Helpers, $ } from './helpers'
import { ipcRenderer, clipboard } from 'electron'
import { YoutubeSearch } from './youtubeSearch'
import { YoutubeMusic } from './youtubeMusic'
import { Netflix } from './netflix'

export type ViewNames = 'ytmusic'|'netflix'|'youtubeSubscriptions'|'youtubesearch';

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

	magicButton: void;
	lowerVolume: void;
	raiseVolume: void;
	pausePlay: void;
	focus: void;
	pause: void;
	play: void;

	quit: void;

	messageServer: void;
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
	changeYoutubeSubsLink: {
		link: string;
	}
	navToVideo: string;
	youtubeSearchClick: void;
}

const KeyListeningViews: ViewNames[] = [
	'ytmusic',
	'youtubeSubscriptions',
	'youtubesearch'
];

export namespace AppWindow {
	const titleBar = document.querySelector('#titleBar');
	let activeView: ViewNames = null;
	
	type AppEvent = 'onFullscreened'|'onMaximized'|'onRestored'|'onMinimized';
	
	const listeners: {
		event: AppEvent;
		callback: () => void;
	}[] = [];
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
		const events: AppEvent[] = ['onFullscreened', 'onMaximized', 'onRestored', 'onMinimized'];
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

		document.addEventListener('keydown', (e) => {
			if (getActiveViewName() in KeyListeningViews) {
				if (e.key === 'v' && e.ctrlKey) {
					//It's a paste
					const pasteData = clipboard.readText();
					YoutubeSearch.onPaste(pasteData);
				} else {
					//This view has no listeners itself, pass them along
					onKeyPress(e as MappedKeyboardEvent);
				}
			}
		});
	}

	async function onShortcut(command: keyof MessageReasons | EXTERNAL_EVENT) {
		const activeViewView = getActiveViewClass().Commands;
		switch (command) {
			case 'lowerVolume':
				activeViewView.lowerVolume();
				break;
			case 'raiseVolume':
				activeViewView.raiseVolume();
				break;
			case 'pausePlay':
				activeViewView.togglePlay();
				break;
			case 'pause':
				activeViewView.pause();
				break;
			case 'play':
				activeViewView.play();
				break;
			case 'focus':
				onFocus();
				break;
			case 'magicButton':
				onMagicButton();
				break;
			case 'youtubeSubscriptions':
				switchToview('youtubeSubscriptions');
				break;
			case 'youtubeMusic':
				switchToview('ytmusic');
				break;
			case 'youtubeSearch':
				switchToview('youtubesearch');
				break;
			case 'netflix':
				switchToview('netflix');
				break;
			case 'up':
				if (activeView === 'youtubeSubscriptions') {
					Helpers.hacksecute(await YoutubeSubscriptions.SubBox.getView(), () => {
						window.videos.selected.goUp();
					});
				}
				break;
			case 'down':
				if (activeView === 'youtubeSubscriptions') {
					Helpers.hacksecute(await YoutubeSubscriptions.SubBox.getView(), () => {
						window.videos.selected.goDown();
					});
				}
				break;
			case 'left':
				if (activeView === 'youtubeSubscriptions') {
					Helpers.hacksecute(await YoutubeSubscriptions.SubBox.getView(), () => {
						window.videos.selected.goLeft();
					});
				}
				break;
			case 'right':
				if (activeView === 'youtubeSubscriptions') {
					Helpers.hacksecute(await YoutubeSubscriptions.SubBox.getView(), () => {
						window.videos.selected.goRight();
					});
				}
				break;
			case 'toggleVideo':
				if (activeView === 'youtubeSubscriptions') {
					YoutubeSubscriptions.toggleVideoVisibility();
				} else if (activeView === 'youtubesearch') {
					YoutubeSearch.toggleVideoVisibility();
				}
				break;
		}
	}

	async function showSpinner() {
		await Helpers.wait(100);
		$('#spinner').classList.add('active');
		$('#spinnerCont').classList.remove('hidden');
	}
	
	function hideSpinner() {
		$('#spinnerCont').classList.add('hidden');
		$('#spinner').classList.remove('active');
	}

	function handleKeyboardEvent(event: MappedKeyboardEvent) {
		if (event.key === 'Escape') {
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

	export const loadedViews: ViewNames[] = [];
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

	export async function switchToview(view: ViewNames, first: boolean = false) {
		if (view === activeView && !first) {
			return;
		} 

		if (!first) {
			//Pause current view
			getActiveViewClass().Commands.pause();
		}

		activeView = view;
		const isLoaded = view in loadedViews;
		if (isLoaded) {
			hideSpinner();
			getActiveViewClass().Commands.play();
		} else {
			await showSpinner();
			await getViewByName(view).setup();
		}

		const viewsEl = $('#views');
		viewsEl.classList.remove('ytmusic', 'netflix', 'youtubeSubscriptions', 'youtubesearch');
		viewsEl.classList.add(view);

		if (isLoaded) {
			await Helpers.wait(500);
			getActiveViewClass().onFocus();
		}
	}

	export async function init(startView: ViewNames) {
		activeView = startView;
		$('#views').classList.add(startView);

		listenForMessages();
		prepareEventListeners();
		setupListeners();

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
		getActiveViewClass().onKeyPress(event);
	}

	const channels: {
		identifier: string;
		fn: (data: MessageReasons[keyof MessageReasons]) => void
	}[] = [];

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

	function listenForMessages() {
		ipcRenderer.on('fromBgPage', (event: Event, message: {
			identifier: string;
			data: MessageReasons[keyof MessageReasons];
			type: 'response';
		}|{
			cmd: keyof MessageReasons | EXTERNAL_EVENT
			type: 'event';
		}) => {
			if (message.type === 'response') {
				const identifier = message.identifier;
				channels.filter((val) => {
					return val.identifier === identifier
				}).forEach((val) => {
					val.fn(message.data);
					channels.splice(channels.indexOf(val), 1);
				});
			} else {
				onShortcut(message.cmd);
			}
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
					YoutubeMusic.saveURL(saveUrlRes.url);
					break;
				case 'keyPress':
					const keyPressRes = data as PassedAlongMessages['keyPress'];
					onKeyPress(keyPressRes);
					break;
				case 'paste':
					const pasteData = data as PassedAlongMessages['paste'];
					YoutubeSearch.onPaste(pasteData);
					break;
				case 'changeYoutubeSubsLink':
					const youtubeSubsData = data as PassedAlongMessages['changeYoutubeSubsLink'];
					YoutubeSubscriptions.changeVideo(youtubeSubsData.link);
					break;
				case 'navToVideo':
					const navToVideoData = data as PassedAlongMessages['navToVideo'];
					YoutubeSearch.changeVideo(navToVideoData);
					break;
				case 'youtubeSearchClick':
					YoutubeSearch.SearchBar.onPageClick();
			}
		});
	}

	export async function sendBackgroundPageMessage<T extends keyof MessageReasons>(reason: T, data?: {
		type: string;
		data: {
			app: string;
			status: string;
		};
	}): Promise<MessageReasons[T]> {
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
				data: data
			});
		});
	}

	function mapViewName(viewName: ViewNames): string {
		switch (viewName) {
			case 'netflix':
				return 'Netflix';
			case 'youtubesearch': 
				return 'YTs';
			case 'youtubeSubscriptions':
				return 'Subs';
			case 'ytmusic':
				return 'music';
		}
	}

	export function updateStatus(status: string) {
		sendBackgroundPageMessage('messageServer', {
			type: 'statusUpdate',
			data: {
				app: mapViewName(getActiveViewName()),
				status: status
			}
		});
	}
}