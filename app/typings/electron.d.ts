type Partitions = 'netflix'|'tracklists'|'youtubeplaylist'|
	'youtubeSearch'|'youtubeSubscriptions'|'youtubeSubsVideoView';

interface KeyCommands {
	magicButton: void;
	lowerVolume: void;
	raiseVolume: void;
	pausePlay: void;
	focus: void;
	pause: void;
	launch: void;	
}

type keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 
'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
'W', 'X', 'Y', 'Z', 'Shift', 'Alt', 'Left', 'Right', 'Down',
'Up', 'MediaNextTrack', 'MediaPreviousTrack', 'MediaStop',
'MediaPlayPause', 'Space', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

type KeyCombinations = {
	[key in keyof KeyCommands]: (keys[keyof keys][]|keys[keyof keys])[]
};

type MessageReasons = KeyCommands & {
	isMinimized: boolean;
	isFullscreen: boolean;
	isMaximized: boolean;

	onFullscreened: void;
	onMaximized: void;
	onRestored: void;
	onMinimized: void;

	exitFullscreen: void;
	enterFullscreen: void;
	openDevTools: void;
	minimize: void;
	maximize: void;
	restore: void;
	close: void;

	play: void;	

	quit: void;

	messageServer: void;
	playStatus: void;

	getKeyBindings: KeyCombinations;
	setKeyBinding: void;
}

type MappedKeyboardEvent = KeyboardEvent | {
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

interface PassedAlongMessages {
	loadingCompleted: {
		view: 'ytmusic'|'netflix'|'youtubeSubscriptions'|'youtubesearch';
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
	onVideoEnded: void;

	onPause: {
		view: 'ytmusic'|'netflix'|'youtubeSubscriptions'|'youtubesearch';
	};
	onPlay: {
		view: 'ytmusic'|'netflix'|'youtubeSubscriptions'|'youtubesearch';
	};
}

type PassedAlongMessage<T extends keyof PassedAlongMessages> = {
	type: T;
	data: PassedAlongMessages[T];
}

declare namespace SafeIPCRenderer {
	type MessageHandler<T> = (event: Event, message: T) => void;

	export type PassAlongMessage = {
		type: 'passAlong';
		data?: PassedAlongMessage<keyof PassedAlongMessages>;
	};

	type MessagePairs = {
		'log': {
			type: 'info'|'log'|'warn'|'error';
			args: any[];
		}|{
			type: 'toast';
			args: string;
		};
	
		'fromBgPage': {
			identifier: string;
			data: MessageReasons[keyof MessageReasons];
			type: 'response';
		}|{
			cmd: keyof MessageReasons | EXTERNAL_EVENT | ARG_EVENT
			type: 'event';
			data?: string;
		};
	
		'toBgPage': {
			identifier?: string;
			type: keyof MessageReasons;
			respond?: boolean;
			data?: any;
		} | PassAlongMessage;

		'task': {
			name: string;
			page: string;
			id: number;
		}
		
		'passedAlong': PassedAlongMessage<keyof PassedAlongMessages>;

		'eval': string;
	}
}

type EXTERNAL_EVENT = 'focus'|'lowerVolume'|'raiseVolume'|'pausePlay'|
	'magicButton'|'pause'|'youtubeSubscriptions'|'youtubeMusic'|
	'youtubeSearch'|'netflix'|'up'|'down'|'left'|'right'|'toggleVideo';

type ARG_EVENT = 'cast'|'hiddenCast';

type IPCMessage<T extends keyof SafeIPCRenderer.MessagePairs, U extends SafeIPCRenderer.MessagePairs[T]> = [T, U];

declare namespace Electron {	
	interface IpcRenderer extends Electron.EventEmitter {
		on<T extends keyof SafeIPCRenderer.MessagePairs>(channel: T, listener: SafeIPCRenderer.MessageHandler<SafeIPCRenderer.MessagePairs[T]>): this;
		send<T extends keyof SafeIPCRenderer.MessagePairs>(channel: T, arg: SafeIPCRenderer.MessagePairs[T]): this;
	}

	interface IpcMain extends Electron.EventEmitter {
		on<T extends keyof SafeIPCRenderer.MessagePairs>(channel: T, listener: SafeIPCRenderer.MessageHandler<SafeIPCRenderer.MessagePairs[T]>): this;
		send<T extends keyof SafeIPCRenderer.MessagePairs>(channel: T, arg: SafeIPCRenderer.MessagePairs[T]): this;
	}
}

type sendIPCMessage = <T extends keyof SafeIPCRenderer.MessagePairs>(channel: T, message: SafeIPCRenderer.MessagePairs[T]) => void;