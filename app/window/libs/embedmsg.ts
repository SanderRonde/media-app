import { embeddableSend, onTask, OnTaskType } from '../../backgroundLibs/msg/msg';
import { inlineFn } from '../libs/util';

declare var window: MessageableWindow;

export interface EmbeddedFns {
	sendMessage: typeof embeddableSend;
	inlineFn: typeof inlineFn;
	onTask: OnTaskType;
}

export type MessageableWindow<T extends Window = Window> = T & EmbeddedFns;


window.sendMessage = embeddableSend;
window.inlineFn = inlineFn;
window.onTask = onTask();