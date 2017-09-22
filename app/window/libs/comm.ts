/// <reference path="../../window/views/youtube/1001tracklists/content.ts" />
/// <reference path="../../window/views/youtube/content/content.ts" />

import { ViewNames } from '../views/appWindow';
declare var sendIPCMessage: sendIPCMessage;

(() => {
	let commId = 0;
	const ipcRenderer = require('electron').ipcRenderer;

	function listenForCommPageResponse(id: number, callback: (result: string|boolean|number) => void) {
		let removalId = window.setInterval(() => {
			let result;
			if ((result = localStorage.getItem(`taskResult${id}`))) {
				window.clearInterval(removalId);
				callback(result);
			}
		}, 50);
	}

	window.commToPage = function(task: string, callback: (result: string) => void) {
		let tasks: {
			name: string;
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
			id: ++commId
		});
		listenForCommPageResponse(commId, callback);
		localStorage.setItem('tasks', JSON.stringify(tasks));
	}

	function getTaskRunner() {
		return window.doTask1 || window.doTask2;
	}

	ipcRenderer.on('task', (event, task) => {
		if (location.href.indexOf(task.page) > -1) {
			getTaskRunner() && getTaskRunner()(task.name, task.id, (result) => {
				sendIPCMessage('toBgPage', {
					type: 'passAlong',
					data: {
						type: 'taskResult',
						data: {
							result: result,
							name: task.name,
							id: task.id
						}
					} as PassedAlongMessage<'taskResult'> 
				});
			});
		}
	});

	let loaded = false;
	const intervalId = window.setInterval(() => {
		if (localStorage.getItem('loaded') && localStorage.getItem('loaded') !== 'none') {
			loaded = true;
			window.clearInterval(intervalId);

			sendIPCMessage('toBgPage', {
				type: 'passAlong',
				data: {
					type: 'loadingCompleted',
					data: {
						view: localStorage.getItem('loaded') as ViewNames
					}
				} as PassedAlongMessage<'loadingCompleted'>
			});

			localStorage.setItem('loaded', 'none');
		}
	}, 250);
})();