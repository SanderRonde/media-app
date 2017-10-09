import electron = require('electron');
const ipcRenderer = electron.ipcRenderer;
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

	export interface ExternalEventsNoArg {
		focus: Msg;
		lowerVolume: Msg;
		raiseVolume: Msg;
		pausePlay: Msg;
		pause: Msg;
		play: Msg;
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

	export type ExternalEventsMap = ExternalEventsNoArg & ExternalEventsWithArg;

	export interface WindowEventsMap {
		onFullscreened: void;
		onMaximized: void;
		onMinimized: void;
		onRestored: void;
	}

	type ToBgPageCommandsMap = KeyCommands & {
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

	export type ToBgPageCommands = keyof ToBgPageCommandsMap;

	export interface KeyCommands {
		magicButton: Msg;
		lowerVolume: Msg;
		raiseVolume: Msg;
		pausePlay: Msg;
		focus: Msg;
		pause: Msg;
		launch: Msg;
	}

	interface MessagesMap {
		log: {
			info: Msg<any[]>;
			log: Msg<any[]>;
			warn: Msg<any[]>;
			error: Msg<any[]>;
			toast: Msg<string>
		}

		toBgPage: ToBgPageCommandsMap;

		events: WindowEventsMap & ExternalEventsMap;

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

	export interface Tasks {
		getTimestamps: Msg<None, {
			found: true;
			data: number[]|string;
		}|{
			found: false;
			data: {
				url: string;
				name: string;
			}
		}>;
		getImageOCR: Msg<None, string>;
		getTime: Msg<None, number>;
		getSongName: Msg<number, string>;
		searchFor: Msg<string>;
		findItem: Msg<string, string>;
	}

	export type TaskMessage<T extends keyof Tasks = keyof Tasks> = {
		type: T;
		data: Tasks[T]['arg'];
		page: string;
		identifier: number;
	}

	export type IPCMessage<C extends MessageTypes.ChannelName = MessageTypes.ChannelName, M extends MessageTypes.ChannelMessageName<C> = MessageTypes.ChannelMessageName<C>> = {
		channel: C;
		type: M;
		data: ChannelMessage<C, M>['arg'];
		identifier: number;
		messageServerId: string
	}

	export type ChannelName = keyof MessagesMap;
	type Channel<C extends ChannelName> = MessagesMap[C];
	export type ChannelMessageName<C extends ChannelName> = keyof Channel<C>;
	export type ChannelMessage<C extends ChannelName, M extends ChannelMessageName<C>> = Channel<C>[M];
	export type MessageResult = ChannelMessage<ChannelName, ChannelMessageName<ChannelName>>['res'];
	export type MessageData = ChannelMessage<ChannelName, ChannelMessageName<ChannelName>>['arg'];

	export type AllMessageListener<C extends ChannelName = ChannelName, M extends MessageTypes.ChannelMessageName<C> = MessageTypes.ChannelMessageName<C>> = 
		(type: M, data: MessageTypes.ChannelMessage<C, M>['arg']) => Promise<MessageTypes.ChannelMessage<C, M>['res']>|MessageTypes.ChannelMessage<C, M>['res']|symbol
	export type MessageListener<C extends ChannelName = ChannelName, M extends MessageTypes.ChannelMessageName<C> = MessageTypes.ChannelMessageName<C>> = 
		(data: MessageTypes.ChannelMessage<C, M>['arg']) => Promise<MessageTypes.ChannelMessage<C, M>['res']>|MessageTypes.ChannelMessage<C, M>['res']|symbol

	export type HandlerData<C extends ChannelName, M extends MessageTypes.ChannelMessageName<C> = MessageTypes.ChannelMessageName<C>> = {
		type: M;
		data: MessageTypes.ChannelMessage<C, M>['arg'];
	}
}

namespace ReturnValues {
	const identifierMaps = new Map<number, (data: any) => any>();

	function generateIdentifier(): number {
		let number = 0;
		while (identifierMaps.has(number)) {
			number++;
		}
		return number;
	}

	function setIdTimer(id: number) {
		(typeof window !== 'undefined' ? window.setTimeout : setTimeout)(() => {
			if (identifierMaps.has(id)) {
				identifierMaps.delete(id);
			}
		}, 30000);
	}

	export function createIdentifier(callback: (data: any) => any): number {
		const id = generateIdentifier();
		identifierMaps.set(id, callback);
		setIdTimer(id);
		return id;
	}

	export function returnToIdentifier(identifier: number, value: any) {
		if (identifier === -1) {
			return true;
		}
		if (!identifierMaps.has(identifier)) {
			return false;
		}
		identifierMaps.get(identifier)(value);
		identifierMaps.delete(identifier);
		return true;
	}
}

export class AppMessageServer {
	private _ids: number[] = [];

	constructor(private _refs: {
		activeWindow: Electron.BrowserWindow;
		activeWindowPromise: Promise<Electron.BrowserWindow>;
		idGenerator: AppMessageServer|number;
	}) {
		this._listen();
	}

	private _genId() {
		let id = 0;
		while (this._ids.indexOf(id) > -1) {
			id++;
		}
		this._ids.push(id);
		return id;
	}

	private async getActiveWindow() {
		if (this._refs.activeWindow) {
			return this._refs.activeWindow;
		} else {
			return await this._refs.activeWindowPromise;
		}
	}

	private _listen() {
		const ipcMain = require('electron').ipcMain;
		ipcMain.on('genId', (event: IPCEvent) => {
			event.returnValue = this._genId();
		});
		ipcMain.on('main', async (event: IPCEvent, message: MessageTypes.IPCMessage) => {
			if (message.channel === 'toWindow') {
				//Pass it along
				const win = await this.getActiveWindow();
				win.webContents.send('main', message);
			}
		});
	}

	public gen() {
		return this._genId();
	}
}

interface IPCEvent extends Event {
	sender: typeof ipcRenderer;
	returnValue: any;
}

class Channel<C extends MessageTypes.ChannelName> {
	private _listeners: ({
		listenerType: 'all';
		listener: MessageTypes.AllMessageListener<C>
	}|{
		listenerType: MessageTypes.ChannelMessageName<C>;
		listener: MessageTypes.MessageListener<C>;
	})[] = [];

	private _channelId: string;

	constructor(public channel: C, private _server: {
		getIpcs: () => Promise<{
			receiver: Electron.EventEmitter;
			sender: {
				send(channel: string, ...arg: any[]): void;
				sendSync?(channel: string, ...arg: any[]): any;
			};
		}>;
		id: number;
		channelId: number;
		ipcSource: {
			type: 'renderer';
			refs: {
				activeWindow: Electron.BrowserWindow;
				activeWindowPromise: Promise<Electron.BrowserWindow>;
				idGenerator: AppMessageServer|number;
			};
		}|{
			type: 'window';
		};
		temp: boolean;
	}) {
		const { id, channelId } = _server;
		if (!_server.temp) {
			this._listen();
		}
		this._channelId = `${id}-${channelId}`;
		if (typeof window !== 'undefined') {
			window.addEventListener('unload', () => {
				this._removeListeners();
			});
		}
	}

	private _getIpcs() {
		return this._server.getIpcs();
	}

	private _onMainMessage(event: IPCEvent, msg: MessageTypes.IPCMessage) {
		const { channel, type, data, identifier, messageServerId } = msg;
		if (channel !== this.channel) {
			return;
		}


		let returned: boolean = false;
		this._listeners.forEach(async (listenerData) => {
			const { listenerType, listener } = listenerData;
			if (listenerType !== type && listenerType !== 'all') {
				return;
			}

			let result: any = null;
			if (listenerType === 'all') {
				result = (<MessageTypes.AllMessageListener<C>>listener)(type, data);
			} else {
				result = (<MessageTypes.MessageListener<C>>listener)(data);
			}
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

			if (returned && finalValue !== MessageServer.NO_RETURN) {
				new MessageServer(this._server.ipcSource.type === 'renderer' ?
					this._server.ipcSource.refs : void 0, true).channel('log').send('warn', 
						[`Message ${type} was listener for multiple times, second one being` +
						` of type ${listenerType}`, 'Listener is', listener.toString()]);
				return;
			}

			if (finalValue !== MessageServer.NO_RETURN) {
				event.sender.send('mainReply', {
					identifier: identifier,
					finalValue: finalValue,
					messageServerId: messageServerId,
					type: type
				});
				returned = true;
			}
		});
	}

	private _onMainReply(event: IPCEvent, message: {
		identifier: number;
		finalValue: any;
		messageServerId: string;
		type: string;
	}) {
		const { identifier, finalValue, type, messageServerId } = message;
		const receiverServerId = ~~this._channelId.split('-')[0];
		const senderServerId = ~~((messageServerId && messageServerId.split('-')[0]) || -1);
		if (messageServerId !== this._channelId || receiverServerId === -1 ||
			senderServerId === -1) {
				return;
			}
		if (!ReturnValues.returnToIdentifier(identifier, finalValue)) {
			new MessageServer(this._server.ipcSource.type === 'renderer' ?
				this._server.ipcSource.refs : void 0, true).channel('log').send('warn', 
					[`Listener for identifier ${identifier} of msg type ${type} does not exist (non-task)`]);
		}
	}

	private _onTaskResponse(event: IPCEvent, msg: {
		identifier: number;
		result: any;
	}) {
		const { result, identifier } = msg;
		if (!ReturnValues.returnToIdentifier(identifier, result)) {
			new MessageServer(this._server.ipcSource.type === 'renderer' ?
				this._server.ipcSource.refs : void 0, true).channel('log').send('warn', 
					[`Listener for identifier ${identifier} does not exist (non-task)`]);
		}
	}

	private _eventListeners: {
		[key: string]: Function;
	} = {};

	private _setListener(receiver: Electron.EventEmitter, event: string, listener: Function) {
		const boundListener = listener.bind(this);
		this._eventListeners[event] = boundListener;
		receiver.on(event, boundListener);
	}

	private async _listen() {
		const { receiver } = await this._getIpcs();

		this._setListener(receiver, 'main', this._onMainMessage);
		this._setListener(receiver, 'mainReply', this._onMainReply);
		if (this._server.ipcSource.type === 'window') {
			this._setListener(receiver, 'taskResponse', this._onTaskResponse);			
		}
	}

	private async _removeListeners() {
		const { receiver } = await this._getIpcs();

		for (let event in this._eventListeners) {
			receiver.removeListener(event, this._eventListeners[event]);
			delete this._eventListeners[event];
		}
	}

	private _genIpcMessage<M extends MessageTypes.ChannelMessageName<C>>(type: M, 
		data: MessageTypes.ChannelMessage<C, M>['arg'], identifier: number): MessageTypes.IPCMessage<C, M> {
			return {
				channel: this.channel,
				type: type,
				data: data,
				identifier: identifier,
				messageServerId: this._channelId
			}
		}

	public send<M extends MessageTypes.ChannelMessageName<C>>(type: M, 
		data: MessageTypes.ChannelMessage<C, M>['arg']): Promise<MessageTypes.ChannelMessage<C, M>["res"]> {
			return new Promise(async (resolve) => {
				const msg = this._genIpcMessage(type, data, ReturnValues.createIdentifier((data) => {
					resolve(data);
				}));
				(await this._getIpcs()).sender.send('main', msg);
			});
		}

	public on<M extends MessageTypes.ChannelMessageName<C>>(message: M, 
		handler: (data: MessageTypes.ChannelMessage<C, M>['arg']) => MessageTypes.ChannelMessage<C, M>['res']) {
			this._listeners.push({
				listenerType: message,
				listener: handler
			});
		}

	public onAll(handler: MessageTypes.AllMessageListener) {
		this._listeners.push({
			listenerType: 'all', 
			listener: handler
		});
	}
}

export class MessageServer {
	private _ipcSource: {
		type: 'renderer';
		refs: {
			activeWindow: Electron.BrowserWindow;
			activeWindowPromise: Promise<Electron.BrowserWindow>;
			idGenerator: AppMessageServer|number;
		};
	}|{
		type: 'window';
	}

	private _messageServerId: number;
	private _channelIds: number[] = [];

	constructor(refs?: {
		activeWindow: Electron.BrowserWindow;
		activeWindowPromise: Promise<Electron.BrowserWindow>;
		idGenerator: AppMessageServer|number;
	}, private _temp?: boolean) {
		const isRenderer = !!electron.dialog;
		if (isRenderer) {
			this._ipcSource = {
				type: 'renderer',
				refs: refs
			}
			if (typeof refs.idGenerator === 'number') {
				this._messageServerId = refs.idGenerator;
			} else {
				this._messageServerId = refs.idGenerator.gen();
			}
		} else {
			this._ipcSource = {
				type: 'window'
			}
			this._messageServerId = this._genMessageServerId();
		}

		this._getIpcs().then(({receiver}) => {
			receiver.setMaxListeners(100);
		});
	}

	private _genChannelID() {
		let id = 0;
		while (this._channelIds.indexOf(id) > -1) {
			id++;
		}
		return id;
	}

	public channel<C extends MessageTypes.ChannelName>(channel: C): Channel<C> {
		return new Channel<C>(channel, {
			getIpcs: this._getIpcs.bind(this),
			id: this._messageServerId,
			channelId: this._genChannelID(),
			ipcSource: this._ipcSource,
			temp: this._temp
		});
	}

	private _genMessageServerId(): number {
		return electron.ipcRenderer.sendSync('genId');
	}

	private async _getIpcs(): Promise<{
		receiver: Electron.EventEmitter;
		sender: {
			send(channel: string, ...arg: any[]): void;
			sendSync?(channel: string, ...arg: any[]): any;
		}
	}> {
		if (this._ipcSource.type === 'renderer') {
			let win = this._ipcSource.refs.activeWindow;
			if (!win) {
				win = await this._ipcSource.refs.activeWindowPromise;
			}
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

	public static NO_RETURN = Symbol('noReturnValue');

	public sendTask<T extends keyof MessageTypes.Tasks>(task: T, 
		data: MessageTypes.Tasks[T]['arg'], page: string): Promise<MessageTypes.Tasks[T]['res']> {
			return new Promise(async (resolve) => {
				const msg = {
					type: task,
					data: data,
					page: page,
					identifier: ReturnValues.createIdentifier((data) => {
						resolve(data);
					})
				};
				(await this._getIpcs()).sender.send('task', msg);
			});
		}
}

export function embeddableSend<C extends MessageTypes.ChannelName, 
	M extends MessageTypes.ChannelMessageName<C>>(channel: C, type: M, 
	data: MessageTypes.ChannelMessage<C, M>['arg']) {
		const ipcRenderer = require('electron').ipcRenderer;
		ipcRenderer.send('main', {
			channel: channel,
			type: type,
			data: data,
			identifier: -1
		});
	}

export function onTask() {
	let taskListeners: ((data: any) => any)[] = [];
	const ipcRenderer = require('electron').ipcRenderer;
	ipcRenderer.on('task', async (taskDescription: MessageTypes.TaskMessage) => {
		taskListeners.forEach((listener) => {
			listener(taskDescription);
		});
	});

	return <T extends keyof MessageTypes.Tasks>(task: T, 
		listener: (data: MessageTypes.Tasks[T]['arg']) => Promise<MessageTypes.Tasks[T]['res']>|MessageTypes.Tasks[T]['res']) => {
			const ipcRenderer = require('electron').ipcRenderer;
			taskListeners.push(async (taskDescription: MessageTypes.TaskMessage) => {
				const { type, data, identifier } = taskDescription;
				if (type === task) {
					const result = listener(data);
					let finalResult: MessageTypes.Tasks[T]['res'] = void 0;
					if (result === void 0) {
						finalResult = void 0;
					} else if ('then' in (<Promise<MessageTypes.Tasks[T]['res']>>result)) {
						finalResult = await result;
					} else {
						finalResult = result as MessageTypes.Tasks[T]['res'];
					}

					ipcRenderer.send('taskResponse', {
						identifier: identifier,
						result: finalResult
					});
				}
			});
		}
	}

export type EmbeddableSendType = typeof embeddableSend;
export type OnTaskType = typeof onTask;
export type MessageServerChannel<C extends MessageTypes.ChannelName> = Channel<C>;