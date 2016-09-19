let commId = 0;

function listenForCommPageResponse(id, callback) {
	let removalId = window.setInterval(() => {
		let result;
		if ((result = localStorage.getItem(`taskResult${id}`))) {
			window.clearInterval(removalId);
			callback(result);
		}
	}, 50);
}

function commToPage(task, callback) {
	let tasks = localStorage.getItem('tasks');
	try {
		tasks = JSON.parse(tasks);
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

function uncirculizeWord(word) {
	return {
		bbox: word.bbox,
		text: word.text,
		confidence: word.confidence,
		choices: word.choices
	}
}

function doTask(name, id) {
	function done(result) {
		chrome.runtime.sendMessage({
			cmd: 'taskResult',
			result: result,
			id: id
		});
	}

	switch (name) {
		case 'getTimestamps':
			const descr = document.querySelector('#eow-description');
			let timestampContainers = descr.querySelectorAll('a[href="#"]');
			timestampContainers = Array.from(timestampContainers).filter((timestamp) => {
				return /(\d)\:(\d)(:(\d))*/.test(timestamp.innerHTML);
			});
			let timestamps = null;
			if (timestampContainers.length > 4) {
				//At least 5 songs should be played to make it a tracklist
				timestamps = timestampContainers.map((timestamp) => {
					const split = timestamp.innerHTML.split(':');
					let seconds = 0;
					for (let i = split.length - 1; i >= 0; i--) {
						seconds = Math.pow(60, (split.length - (i + 1))) * ~~split[i];
					}
					return seconds;
				});
				done(timestamps);
			} else {
				//Try to find any links to 1001tracklists in the description
				const tracklistLinks = Array.from(descr.querySelectorAll('a')).map((anchor) => {
					if (anchor.getAttribute('href').match(/http(s)?:\/\/www\.1001tracklists\.com\/tracklist\//)) {
						return anchor.getAttribute('href');
					} 
					return null;
				}).filter((anchor) => {
					return anchor !== null;
				});

				if (tracklistLinks.length > 0) {
					done(tracklistLinks[0]);
				} else {
					done(false);
				}
			}
			break;
		case 'getImageOCR':
			ctx.drawImage(document.querySelector('video'), 0, 0, canv.width, canv.height);
			const img = new Image();
			img.src = canv.toDataURL('image/png');

			Tesseract.recognize(img, {
				lang: 'eng'
			}).then((result) => {
				debugger;
				done(JSON.stringify({
					lines: result.lines.map((line) => {
						return {
							bbox: line.bbox,
							text: line.text,
							confidence: line.confidence,
							words: line.words.map(uncirculizeWord)
						}
					}),
					text: result.text,
					words: result.words.map(uncirculizeWord)
				}));
			});

			break;
		case 'getTime':
			commToPage('getTime', done);
			break;
		default:
			commToPage(name, done);
			break;
	}
}

chrome.storage.onChanged.addListener((changes, areaName) => {
	if (areaName === 'local') {
		if (changes.tasks &&
				Array.isArray(changes.tasks.newValue) &&
				changes.tasks.newValue.length > 0) {
			changes.tasks.newValue.forEach((task) => {
				doTask(task.name, task.id);
			});
			chrome.storage.local.set({
				tasks: []
			});
		}
	}
});