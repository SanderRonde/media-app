interface Window {
	commToPage(task: string, callback: (result: string) => void): void;
	doTask(name: string, id: number, callback: (result: string) => void): void;
}

let commId = 0;

function listenForCommPageResponse(id: number, callback: (result: string) => void) {
	let removalId = window.setInterval(() => {
		let result;
		if ((result = localStorage.getItem(`taskResult${id}`))) {
			window.clearInterval(removalId);
			callback(result);
		}
	}, 50);
}

window.commToPage = function(task, callback) {
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

chrome.storage.onChanged.addListener((changes, areaName) => {
	if (areaName === 'local') {
		if (changes.tasks &&
				Array.isArray(changes.tasks.newValue) &&
				changes.tasks.newValue.length > 0) {
			changes.tasks.newValue.forEach((task) => {
				if (location.href.indexOf(task.page) > -1) {
					window.doTask && window.doTask(task.name, task.id, (result) => {
						chrome.runtime.sendMessage({
							cmd: 'taskResult',
							result: result,
							name: task.name,
							id: task.id
						});
					});
				}
			});
			chrome.storage.local.set({
				tasks: []
			});
		}
	}
});

localStorage.removeItem('loaded');
let loaded = false;
const intervalId = window.setInterval(() => {
	if (localStorage.getItem('loaded')) {
		loaded = true;
		window.clearInterval(intervalId);
		
		chrome.runtime.sendMessage({
			cmd: 'loadingCompleted',
			view: localStorage.getItem('loaded')
		});
	}
}, 250);