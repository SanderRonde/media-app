import { MessageTypes, MessageServer, MessageServerChannel } from '../../backgroundLibs/msg/msg';
import { YoutubeSubscriptions } from './youtubeSubscriptions';
import { SubBoxWindow } from './youtubeSubs/subBox/subBox';
import { YoutubeSearch } from './youtubeSearch';
import { CommandBar } from '../libs/commandbar';
import { YoutubeMusic } from './youtubeMusic';
import { Util, $ } from '../libs/util';
import { clipboard } from 'electron';
import { Netflix } from './netflix';

export type ViewNames = 'ytmusic'|'netflix'|'youtubeSubscriptions'|'youtubesearch';

const KeyListeningViews: ViewNames[] = [
	'ytmusic',
	'youtubeSubscriptions',
	'youtubesearch'
];


export type MappedKeyboardEvent = KeyboardEvent | {
	readonly bubbles: boolean;
	readonly cancelable: boolean;
	cancelBubble: boolean;
	readonly defaultPrevented: boolean;
	readonly eventPhase: number;
	readonly isTrusted: boolean;
	returnValue: boolean;
	readonly timeStamp: number;
	readonly type: string;
	readonly scoped: boolean;
	initEvent(eventTypeArg: string, canBubbleArg: boolean, cancelableArg: boolean): void;
	preventDefault(): void;
	stopImmediatePropagation(): void;
	stopPropagation(): void;
	deepPath(): EventTarget[];
	readonly AT_TARGET: number;
	readonly BUBBLING_PHASE: number;
	readonly CAPTURING_PHASE: number;
	readonly detail: number;
	readonly view: Window;
	initUIEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, viewArg: Window, detailArg: number): void;
	readonly altKey: boolean;
	readonly char: string | null;
	readonly charCode: number;
	readonly ctrlKey: boolean;
	readonly key: string;
	readonly keyCode: number;
	readonly locale: string;
	readonly location: number;
	readonly metaKey: boolean;
	readonly repeat: boolean;
	readonly shiftKey: boolean;
	readonly which: number;
	readonly code: string;
	getModifierState(keyArg: string): boolean;
	initKeyboardEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, viewArg: Window, keyArg: string, locationArg: number, modifiersListArg: string, repeat: boolean, locale: string): void;
	readonly DOM_KEY_LOCATION_JOYSTICK: number;
	readonly DOM_KEY_LOCATION_LEFT: number;
	readonly DOM_KEY_LOCATION_MOBILE: number;
	readonly DOM_KEY_LOCATION_NUMPAD: number;
	readonly DOM_KEY_LOCATION_RIGHT: number;
	readonly DOM_KEY_LOCATION_STANDARD: number;
} & {
	currentTarget: {
		id: string;
		classList: string[];
		tagName: string;
	};
	path: {
		id: string;
		classList: string[];
		tagName: string;
	}[];
	srcElement: {
		id: string;
		classList: string[];
		tagName: string;
	};
	target: {
		id: string;
		classList: string[];
		tagName: string;
	};
};

export namespace AppWindow {
	const titleBar = document.querySelector('#titleBar');
	let debug: boolean = false;
	let activeView: ViewNames = null;
		
	let messageServer: MessageServer = null;
	let toBgPageChannel: MessageServerChannel<'toBgPage'> = null;

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
				Netflix.Commands.onClose();
				YoutubeMusic.Commands.onClose();
				YoutubeSearch.Commands.onClose();
				YoutubeSubscriptions.Commands.onClose();

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

	async function updateButtonsState() {
		titleBar.classList[await toBgPageChannel.send('isMaximized', null) ? 'add' : 'remove']('maximized');
		titleBar.classList[await toBgPageChannel.send('isFullscreen', null) ? 'add' : 'remove']('fullscreen');
	}

	function setupListeners() {
		window.addEventListener('focus', () => {
			titleBar.classList.add('focused');
			onFocus();
		});
		window.addEventListener('blur', () => {
			titleBar.classList.remove('focused');
		});

		document.querySelector('#fullscreen').addEventListener('click', async (e: MouseEvent) => {
			toBgPageChannel.send(await toBgPageChannel.send('isFullscreen', null) ?
				'exitFullscreen' : 'enterFullscreen', null);
			e.stopPropagation();
		});
		document.querySelector('#minimize').addEventListener('click', async (e: MouseEvent) => {
			toBgPageChannel.send('minimize', null);
			e.stopPropagation();
		});
		document.querySelector('#maximize').addEventListener('click', async (e: MouseEvent) => {
			toBgPageChannel.send(await toBgPageChannel.send('isMaximized', null) ?
				'restore' : 'maximize', null);
			e.stopPropagation();
		});
		document.querySelector('#close').addEventListener('click', (e: MouseEvent) => {
			Netflix.Commands.onClose();
			YoutubeMusic.Commands.onClose();
			YoutubeSearch.Commands.onClose();
			YoutubeSubscriptions.Commands.onClose();

			window.setInterval(() => {
				toBgPageChannel.send('close', null);
			}, 0);
			e.stopPropagation();
		});

		titleBar.addEventListener('click', () => {
			if (activeView === 'youtubesearch') {
				YoutubeSearch.onSearchBarFocus();
			}
		});

		document.addEventListener('keydown', (e) => {
			if (KeyListeningViews.indexOf(getActiveViewName()) > -1) {
				if (e.key === 'v' && e.ctrlKey) {
					//It's a paste
					const pasteData = clipboard.readText();
					YoutubeSearch.onPaste(pasteData);
				} else {
					//This view has no listeners itself, pass them along
					onKeyPress(e);
				}
			}
		});
	}

	export async function onShortcut(command: keyof MessageTypes.ExternalEventsMap, data?: string) {
		const activeViewView = getActiveViewClass().Commands;
		switch (command) {
			case 'lowerVolume':
			case 'raiseVolume':
			case 'pause':
			case 'play':
				activeViewView[command]();
				break;
			case 'pausePlay':
				activeViewView.togglePlay();
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
			case 'right':
				if (activeView === 'youtubeSubscriptions') {
					Util.hacksecute(await YoutubeSubscriptions.SubBox.getView(), () => {
						(<SubBoxWindow>window).videos.selected.goRight();
					});
				} else if (activeView === 'youtubesearch') {
					YoutubeSearch.Queue.skip();
				}
				break;
			case 'up':
			case 'down':
			case 'left':
				if (activeView === 'youtubeSubscriptions') {
					Util.hacksecute(await YoutubeSubscriptions.SubBox.getView(), () => {
						switch (command) {
							case 'up':
								(<SubBoxWindow>window).videos.selected.goUp();
								break;
							case 'down':
								(<SubBoxWindow>window).videos.selected.goDown();
								break;
							case 'left':
								(<SubBoxWindow>window).videos.selected.goLeft();
								break;
						}
					});
				}
				break;
			case 'toggleVideo':
				if (activeView === 'youtubeSubscriptions') {
					YoutubeSubscriptions.Commands.toggleVideoVisibility();
				} else if (activeView === 'youtubesearch') {
					YoutubeSearch.Commands.toggleVideoVisibility();
				}
				break;
			case 'cast':
			case 'hiddenCast':
				YoutubeSearch.Queue.push(data, command === 'hiddenCast');
				break;
		}
	}

	async function showSpinner() {
		await Util.wait(100);
		$('#spinner').classList.add('active');
		$('#spinnerCont').classList.remove('hidden');
	}
	
	async function hideSpinner() {
		$('#spinnerCont').classList.add('hidden');
		$('#spinner').classList.remove('active');
		await Util.wait(500);
		hideTagline();		
	}

	function hideTagline() {
		$('#spinnerCont').classList.add('hideTagline');
	}

	async function handleKeyboardEvent(event: MappedKeyboardEvent) {
		if (event.key === 'Escape') {
			const isFullscreen = await toBgPageChannel.send('isFullscreen', null);
			if (CommandBar.escapePress()) {
				return;
			}
			if (isFullscreen) {
				toBgPageChannel.send('exitFullscreen', null);
			} else {
				Exiting.handleEscapePress();
			}
		} else if (event.key === 'F11') {
			toBgPageChannel.send('isFullscreen', null).then((isFullscreen) => {
				toBgPageChannel.send(isFullscreen ? 'exitFullscreen' : 'enterFullscreen', null);
			});
		} else if (event.key === 'F1') {
			switchToview('youtubeSubscriptions');
		} else if (event.key === 'F2') {
			switchToview('ytmusic');
		} else if (event.key === 'F3') {
			switchToview('youtubesearch');
		} else if (event.key === 'F4') {
			switchToview('netflix');
		} else if (event.key === 'F12') {
			toBgPageChannel.send('openDevTools', null);
		} else if (event.key === 'p' && event.ctrlKey) {
			CommandBar.show();
		} else {
			return;
		}
		console.log(`Key '${event.key}' was pressed and activated`);
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

		getViewByName(view).Commands.updateStatus();
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
		const isLoaded = loadedViews.indexOf(activeView) > -1;
		if (isLoaded) {
			hideSpinner();
			getActiveViewClass().Commands.play();
		} else {
			await showSpinner();
			await getViewByName(view).Commands.setup();
		}

		const viewsEl = $('#views');
		viewsEl.classList.remove('ytmusic', 'netflix', 'youtubeSubscriptions', 'youtubesearch');
		viewsEl.classList.add(view);

		if (isLoaded) {
			await Util.wait(500);
			getActiveViewClass().Commands.onFocus();
		}
	}

	function initTagline() {
		const versionNumber = require('electron').remote.app.getVersion();
		$('#versionNumber').innerText = versionNumber;
	}

	export async function init(startView: ViewNames, isDebug: boolean) {
		debug = isDebug;

		activeView = startView;
		$('#views').classList.add(startView);

		initTagline();
		messageServer = new MessageServer();
		toBgPageChannel = messageServer.channel('toBgPage');
		listenForMessages();
		setupListeners();
		CommandBar.setup();

		switchToview(startView, true);

		window.addEventListener('keydown', (e) => {
			handleKeyboardEvent(e);
		});
	}

	export function getActiveViewName(): ViewNames {
		return activeView;
	}

	export function getActiveViewClass(): ViewTypes {
		return getViewByName(getActiveViewName());
	}

	export async function getActiveViewView(): Promise<Electron.WebviewTag> {
		return await AppWindow.getActiveViewClass().Commands.getView();
	}

	export function onFocus() {
		getActiveViewClass().Commands.onFocus();
	}

	namespace KeyPress {
		let lastEventData: {
			time: Date;
			key: string;
		} = {
			time: new Date(),
			key: null
		};

		function isSameEvent(): boolean {
			const time = new Date();
			if (time.valueOf() - lastEventData.time.valueOf() > 50) {
				return false;
			} else {
				return true;
			}
		}

		function registerLastEvent(event: MappedKeyboardEvent) {
			lastEventData.time = new Date();
			lastEventData.key = event.key;
		}

		export function wasPressed(event: MappedKeyboardEvent): boolean {
			if (isSameEvent() && event.key === lastEventData.key) {
				return false;
			} else {
				registerLastEvent(event);
				return true;
			}
		}
	}

	export async function onKeyPress(event: MappedKeyboardEvent) {
		if (KeyPress.wasPressed(event)) {
			return;
		}

		if (await getActiveViewClass().Commands.onKeyPress(event)) {
			console.log(`Key '${event.key}' was pressed and activated`);
		}
	}

	export function onPlay(view: ViewNames) {
		if (view === getActiveViewName()) {
			toBgPageChannel.send('updatePlayStatus', 'play');
		}
	}

	export function onPause(view: ViewNames) {
		if (view === getActiveViewName()) {
			toBgPageChannel.send('updatePlayStatus', 'pause');
		}
	}

	function listenForMessages() {
		const logChannel = messageServer.channel('log');
		const eventChannel = messageServer.channel('events');
		const toWindowChannel = messageServer.channel('toWindow');

		logChannel.on('info', (args) => {
			console.info('[BGPAGE] -', ...args);
		});
		logChannel.on('log', (args) => {
			console.log('[BGPAGE] -', ...args);
		});
		logChannel.on('warn', (args) => {
			console.warn('[BGPAGE] -', ...args);
		});
		logChannel.on('error', (args) => {
			console.error('[BGPAGE] -', ...args);
		});
		logChannel.on('toast', (message) => {
			Util.showToast(message);
		});

		eventChannel.onAll((type, data) => {
			if (type === 'onMaximized' || type === 'onFullscreened' || 
				type === 'onRestored' || type === 'onMinimized') {
					updateButtonsState();	
					return MessageServer.NO_RETURN;
				} else {
					onShortcut(type, data);
				}
				return void 0;
		});

		toWindowChannel.on('loadingCompleted', (view) => {
			onLoadingComplete(view);
		});
		toWindowChannel.on('saveUrl', (url) => {
			YoutubeMusic.saveURL(url);
		});
		toWindowChannel.on('keyPress', (keyPress) => {
			onKeyPress(keyPress);
		});
		toWindowChannel.on('paste', (pasteData) => {
			YoutubeSearch.onPaste(pasteData);
		});
		toWindowChannel.on('changeYoutubeSubsLink', (link) => {
			YoutubeSubscriptions.changeVideo(link);
		});
		toWindowChannel.on('navToVideo', (videoData) => {
			YoutubeSearch.changeVideo(videoData);
		});
		toWindowChannel.on('youtubeSearchClick', () => {
			YoutubeSearch.SearchBar.onPageClick();
		});
		toWindowChannel.on('onPause', (view) => {
			onPause(view);
		});
		toWindowChannel.on('onPlay', (view) => {
			onPlay(view);
		});
		toWindowChannel.on('onVideoEnded', () => {
			YoutubeSearch.Queue.onVideoEnd();
		});
		toWindowChannel.on('downloadVideo', (url) => {
			Util.downloadVideo(url);
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
				return 'Music';
		}
	}

	export function updateStatus(status: string) {
		toBgPageChannel.send('messageServer', {
			type: 'statusUpdate',
			data: {
				app: mapViewName(getActiveViewName()),
				status: status
			}
		});
	}

	export function isDebug(): boolean {
		return debug;
	}

	export function free(view: ViewNames) {
		getViewByName(view).Commands.free();
		loadedViews.splice(loadedViews.indexOf(view), 1);
	}

	export function freeAllExcept(except: ViewNames) {
		const views: ViewNames[] = ['ytmusic', 'netflix', 'youtubesearch', 'youtubeSubscriptions'];
		for (let toRemove of views) {
			if (toRemove !== except) {
				getViewByName(toRemove).Commands.free();
				loadedViews.splice(loadedViews.indexOf(toRemove), 1);
			}
		}
	}
}