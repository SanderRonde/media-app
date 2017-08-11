/// <reference path="../youtube/1001tracklists/content.ts" />
/// <reference path="../youtube/content/content.ts" />

var ipcRenderer = require('electron').ipcRenderer;

interface Window {
	commToPage(task: string, callback: (result: string) => void): void;
}

let commId = 0;

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

ipcRenderer.on('task', (event: Event, task: {
	name: string;
	page: string;
	id: number;
}) => {
	if (location.href.indexOf(task.page) > -1) {
		getTaskRunner() && getTaskRunner()(task.name, task.id, (result) => {
			ipcRenderer.send('toBpPage', {
				type: 'passAlong',
				data: {
					type: 'taskResult',
					data: {
						result: result,
						name: task.name,
						id: task.id
					}
				}
			});
		});
	}
});

let loaded = false;
const intervalId = window.setInterval(() => {
	if (localStorage.getItem('loaded') && localStorage.getItem('loaded') !== 'none') {
		loaded = true;
		window.clearInterval(intervalId);

		console.log('Something has loaded');
		
		ipcRenderer.send('toBgPage', {
			type: 'passAlong',
			data: {
				type: 'loadingCompleted',
				data: {
					view: localStorage.getItem('loaded')
				}
			}
		});

		localStorage.setItem('loaded', 'none');
	}
}, 250);