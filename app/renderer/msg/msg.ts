import electron = require('electron');
import { MediaApp } from '../../app';
import { Settings } from '../settings/settings';
import { MappedKeyboardEvent, ViewNames } from '../../window/views/appWindow';

export namespace MessageTypes {
	interface None { }

	type SettingsKeyVal<K extends keyof Settings.Settings = keyof Settings.Settings> = {
		key: K;
		val: Settings.Settings[K];
	}

	type ChangeSettingsMessage<K extends keyof Settings.Settings = keyof Settings.Settings> = 
		Msg<K, Settings.Settings[K]>;

	type Msg<ARG = None, RES = void> = {
		arg: ARG;
		res: RES;
	}

	export interface ExternalEvents {
		focus: Msg;
		lowerVolume: Msg;
		raiseVolume: Msg;
		pausePlay: Msg;
		pause: Msg;
		magicButton: Msg;
		youtubeSubscriptions: Msg;
		youtubeMusic: Msg;
		youtubeSearch: Msg;
		netflix: Msg;
		up: Msg;
		down: Msg;
		left: Msg;
		right: Msg;
		toggleVideo: Msg;
	}

	export interface ExternalEventsWithArg {
		cast: Msg<string>;
		hiddenCast: Msg<string>;
	}

	export type ExternalEventsBoth = ExternalEvents & ExternalEventsWithArg;

	export interface KeyCommands {
		magicButton: Msg;
		lowerVolume: Msg;
		raiseVolume: Msg;
		pausePlay: Msg;
		focus: Msg;
		pause: Msg;
		launch: Msg;
	}

	interface Messages {
		log: {
			info: Msg<any[]>;
			log: Msg<any[]>;
			warn: Msg<any[]>;
			error: Msg<any[]>;
			toast: Msg<string>
		}

		toBgPage: KeyCommands & {
			isMinimized: Msg<None, boolean>;
			isFullscreen: Msg<None, boolean>;
			isMaximized: Msg<None, boolean>;
		
			onFullscreened: Msg;
			onMaximized: Msg;
			onRestored: Msg;
			onMinimized: Msg;
		
			exitFullscreen: Msg;
			enterFullscreen: Msg;
			openDevTools: Msg;
			minimize: Msg;
			maximize: Msg;
			restore: Msg;
			close: Msg;
		
			play: Msg;
			quit: Msg;
		
			messageServer: Msg<{
				type: 'statusUpdate';
				data: {
					app: string;
					status: string;
				}
			}|{
				type: 'playUpdate';
				data: {
					playing: boolean;
				}
			}>
			updatePlayStatus: Msg<'play'|'pause'>;
		}

		events: ExternalEventsBoth;

		toWindow: {
			loadingCompleted: Msg<ViewNames>;
			taskResult: Msg<{
				result: any;
				name: string;
				id: number;
			}>;
			saveUrl: Msg<string>;
			keyPress: Msg<MappedKeyboardEvent>;
			paste: Msg<string>;
			changeYoutubeSubsLink: Msg<string>;
			navToVideo: Msg<string>;
			youtubeSearchClick: Msg;
			onVideoEnded: Msg;
	
			onPause: Msg<ViewNames>;
			onPlay: Msg<ViewNames>;
		}

		eval: {
			eval: Msg<string, any>;
		}

		settings: {
			getSetting: ChangeSettingsMessage;
			setSetting: Msg<SettingsKeyVal>;
		}
	}

	export type IPCMessage<C extends MessageTypes.ChannelName = MessageTypes.ChannelName, M extends MessageTypes.ChannelMessageName<C> = MessageTypes.ChannelMessageName<C>> = {
		channel: C;
		type: M;
		data: ChannelMessage<C, M>['arg'];
		identifier: number;
	}

	export type ChannelName = keyof Messages;
	type Channel<C extends ChannelName> = Messages[C];
	export type ChannelMessageName<C extends ChannelName> = keyof Channel<C>;
	export type ChannelMessage<C extends ChannelName, M extends ChannelMessageName<C>> = Channel<C>[M];
	export type MessageResult = ChannelMessage<ChannelName, ChannelMessageName<ChannelName>>['res'];
	export type MessageData = ChannelMessage<ChannelName, ChannelMessageName<ChannelName>>['arg'];

	export type MessageListener<C extends ChannelName = ChannelName, M extends MessageTypes.ChannelMessageName<C> = MessageTypes.ChannelMessageName<C>> = 
		(type: M, data: MessageTypes.ChannelMessage<C, M>['arg']) => Promise<MessageTypes.ChannelMessage<C, M>['res']>|MessageTypes.ChannelMessage<C, M>['res']

	export type HandlerData<C extends ChannelName, M extends MessageTypes.ChannelMessageName<C> = MessageTypes.ChannelMessageName<C>> = {
		type: M;
		data: MessageTypes.ChannelMessage<C, M>['arg'];
	}
}

namespace ReturnValues {
	const identifierMaps = new Map<number, (data: MessageTypes.MessageResult) => void>();

	function generateIdentifier(): number {
		let number = 0;
		while (identifierMaps.has(number)) {
			number++;
		}
		return number;
	}

	export function createIdentifier<C extends MessageTypes.ChannelName, M extends MessageTypes.ChannelMessageName<C>>(
		callback: (data: MessageTypes.ChannelMessage<C, M>['res']) => void
	): number {
		const id = generateIdentifier();
		identifierMaps.set(id, callback);
		return id;
	}

	export function returnToIdentifier(identifier: number, value: MessageTypes.MessageResult) {
		identifierMaps.get(identifier)(value);
		identifierMaps.delete(identifier);
	}
}

export class MessageServer<C extends MessageTypes.ChannelName> {
	private _ipcSource: {
		type: 'renderer';
		refs: typeof MediaApp.Refs;
	}|{
		type: 'window';
	}

	private _listeners: {
		[key in MessageTypes.ChannelName]: [MessageTypes.ChannelMessageName<C>, MessageTypes.MessageListener<key>][];
	} = {
		log: [],
		eval: [],
		events: [],
		settings: [],
		toBgPage: [],
		toWindow: []
	}

	constructor(public channel: C, refs?: typeof MediaApp.Refs) {
		const isRenderer = !!electron.dialog;
		if (isRenderer) {
			this._ipcSource = {
				type: 'renderer',
				refs: refs
			}
		} else {
			this._ipcSource = {
				type: 'window'
			}
		}

		this._listen();
	}

	private _getIpcs(): {
		receiver: {
			on(channel: string, listener: Function): void;
		}
		sender: {
			send(channel: string, ...args: any[]): void;
		}
	} {
		if (this._ipcSource.type === 'renderer') {
			return {
				receiver: electron.ipcMain,
				sender: this._ipcSource.refs.activeWindow.webContents
			}
		} else {
			return {
				receiver: electron.ipcRenderer,
				sender: electron.ipcRenderer
			}
		}
	}

	private _listen() {
		const { receiver } = this._getIpcs();
		receiver.on('main', (msg: MessageTypes.IPCMessage) => {
			const { channel, type, data, identifier } = msg;
			const channelListeners = this._listeners[channel];
			(<[MessageTypes.ChannelMessageName<C>, MessageTypes.MessageListener][]>channelListeners).forEach(async (listenerData) => {
				const [ listenerType, listener ] = listenerData;
				if (listenerType !== type) {
					return;
				}
				const result = listener(type, data);
				let finalValue: MessageTypes.MessageResult = null;
				if (result === void 0) {
					//Nothing was returned
					finalValue = void 0;
				} else if (typeof result === 'object' && 'then' in result) {
					//Promise returned
					const prom = result as Promise<MessageTypes.MessageResult>;
					finalValue = await prom;
				} else {
					//Normal value returned
					finalValue = result;
				}

				ReturnValues.returnToIdentifier(identifier, finalValue);
			});
		});
	}

	private _genIpcMessage<M extends MessageTypes.ChannelMessageName<C>>(type: M, 
		data: MessageTypes.ChannelMessage<C, M>['arg'], identifier: number): MessageTypes.IPCMessage<C, M> {
			return {
				channel: this.channel,
				type: type,
				data: data,
				identifier: identifier
			}
		}

	public send<M extends MessageTypes.ChannelMessageName<C>>(type: M, 
		data: MessageTypes.ChannelMessage<C, M>['arg']): Promise<MessageTypes.ChannelMessage<C, M>["res"]> {
			return new Promise((resolve) => {
				const msg = this._genIpcMessage(type, data, ReturnValues.createIdentifier<C, M>((data) => {
					resolve(data);
				}));
				this._getIpcs().sender.send('main', msg);
			});
		}

	public on<M extends MessageTypes.ChannelMessageName<C>>(message: M, 
		handler: (data: MessageTypes.ChannelMessage<C, M>['arg']) => MessageTypes.ChannelMessage<C, M>['res']) {
			(<[MessageTypes.ChannelMessageName<C>, MessageTypes.MessageListener][]>this._listeners[this.channel]).push([message, handler]);
		}

	public embeddableSend() {
		
	}
}