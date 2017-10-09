/// <reference path="../../window/views/youtube/1001tracklists/content.ts" />
/// <reference path="../../window/views/youtube/content/content.ts" />

import { EmbeddableSendType, MessageTypes } from '../../backgroundLibs/msg/msg';
import { ViewNames } from '../views/appWindow';
declare var sendMessage: EmbeddableSendType;
declare const window: CommWindow;

export interface CommWindow extends Window {
	commToPage<T extends keyof MessageTypes.Tasks>(task: T, data: MessageTypes.Tasks[T]['arg'], callback: (result: MessageTypes.Tasks[T]['res']) => void): void;
}

(() => {
	let commId = 0;

	function listenForCommPageResponse<T extends keyof MessageTypes.Tasks>(id: number, callback: (result: MessageTypes.Tasks[T]['res']) => void) {
		let removalId = window.setInterval(() => {
			let result;
			if ((result = localStorage.getItem(`taskResult${id}`))) {
				window.clearInterval(removalId);
				callback(result);
			}
		}, 50);
	}

	window.commToPage = <T extends keyof MessageTypes.Tasks>(task: T, data: MessageTypes.Tasks[T]['arg'], callback: (result: MessageTypes.Tasks[T]['res']) => void) => {
		let tasks: {
			name: T;
			data: MessageTypes.Tasks[T]['arg'];
			id: number;
		}[];
		try {
			tasks = JSON.parse(localStorage.getItem('tasks'));
		} catch(e) {
			tasks =  [];
		}
		if (!Array.isArray(tasks)) {
			tasks = [];
		}
		tasks.push({
			name: task,
			data: data,
			id: ++commId
		});
		listenForCommPageResponse(commId, callback);
		localStorage.setItem('tasks', JSON.stringify(tasks));
	}

	let loaded = false;
	console.log('Setting interval');
	const intervalId = window.setInterval(() => {
		if (localStorage.getItem('loaded') && localStorage.getItem('loaded') !== 'none') {
			loaded = true;
			window.clearInterval(intervalId);

			console.log('Sending message', localStorage.getItem('loaded'));
			sendMessage('toWindow', 'loadingCompleted', localStorage.getItem('loaded') as ViewNames);

			localStorage.setItem('loaded', 'none');
		}
	}, 250);
})();