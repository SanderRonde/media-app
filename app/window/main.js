function stringifyFunction(fn) {
	return `(${fn.toString()})();`;
}

function createTag(fn) {
	const str = fn.toString();
	return (() => {
		var tag = document.createElement('script');
		tag.innerHTML = `(${str})();`;
		document.documentElement.appendChild(tag);
		document.documentElement.removeChild(tag);
	}).toString().replace('str', str);
}

function hacksecute(view, fn) {
	view.executeScript({
		code: `(${createTag(fn).toString()})();`
			.replace(/\$\{EXTENSIONIDSTRING\}/,
				chrome.runtime.getURL('').split('://')[1].split('/')[0])
	});
}

let taskIds = 0;
const taskListeners = {};
window.returnTaskValue = (result, id) => {
	taskListeners[id] && taskListeners[id](result);
	delete taskListeners[id];
};

function sendTaskToPage(name, callback) {
	chrome.storage.local.get('tasks', (data) => {
		data.tasks = data.tasks || [];
		data.tasks.push({
			name: name,
			id: ++taskIds
		});

		taskListeners[taskIds] = callback;

		chrome.storage.local.set({
			tasks: data.tasks
		});
	});
}

function addRuntimeListeners(view) {
	chrome.runtime.onMessage.addListener(function (message) {
		switch (message.cmd) {
			case 'lowerVolume':
				hacksecute(view, () => {
					const player = document.querySelector('.html5-video-player');
					console.log(player);
					let vol = player.getVolume();
					if (!player.isMuted()) {
						vol -= 5;
						
						vol = (vol < 0 ? 0 : vol);
						player.setVolume(vol);
					}
				});
				break;
			case 'raiseVolume':
				hacksecute(view, () => {
					const player = document.querySelector('.html5-video-player');
					let vol = player.getVolume();
					if (player.isMuted()) {
						//Treat volume as 0
						vol = 0;
						player.unMute();
					}

					vol += 5;
					vol = (vol > 100 ? 100 : vol);
					player.setVolume(vol);
				});
				break;
			case 'pausePlay':
				hacksecute(view, () => {
					const player = document.querySelector('.html5-video-player');
					const state = player.getPlayerState();
					if (state === 2) {
						//Paused
						player.playVideo();
					} else if (state === 1) {
						//Playing
						player.pauseVideo();
					} else {
						//???
					}
				});
				break;
		}
	});
}

function addViewListeners(view) {

	view.addContentScripts([{
		name: 'js',
		matches: ['*://*/*'],
		js: {
			files: ['/content/comm.js', '/content/content.js'],
		},
		run_at: 'document_end'
	}, {
		name: 'css',
		matches: ['*://*/*'],
		css: {
			files: ['/content/content.css']
		},
		run_at: "document_start"
	}]);

	function loadResizer() {
		hacksecute(view, () => {
			if (window.exuectedYTCA) {
				return;
			}
			window.exuectedYTCA = true;

			const player = document.querySelector('.html5-video-player');
			const playerApi = document.getElementById('player-api');
			const volumeBar = document.createElement('div');
			const volumeBarBar = document.createElement('div');
			const volumeBarNumber = document.createElement('div');
			volumeBar.id = 'yt-ca-volumeBar';
			volumeBarBar.id = 'yt-ca-volumeBarBar';
			volumeBarNumber.id = 'yt-ca-volumeBarNumber';

			let volumeBarTimeout = null;

			volumeBar.appendChild(volumeBarNumber);
			volumeBar.appendChild(volumeBarBar);
			document.body.appendChild(volumeBar);

			function prepareVideo() {
				player.setPlaybackQuality('hd1080');
				if (player.getPlaybackQuality() !== 'hd1080') {
					player.setPlaybackQuality('hd720');
				}

				setTimeout(() => {
					if (document.querySelector('.ytp-size-button')
						.getAttribute('title') === 'Theatermodus') {
						function resizeWhenReady() {
							if (player.getAdState() === 1) {
								window.location.reload();
							}

							if (player.getPlayerState() === 3) {
								window.setTimeout(resizeWhenReady, 250);
							} else {
								player.setSizeStyle(true, true);
							}
						}
						resizeWhenReady();
					}
				}, 2500);
			}

			prepareVideo();

			function updateSizes() {
				playerApi.style.width = window.innerWidth + 'px';
				playerApi.style.height = (window.innerHeight - 15) + 'px';

				player.setSize();

				if (document.querySelector('.ytp-size-button')
						.getAttribute('title') === 'Theatermodus') {
					player.setSizeStyle(true, true);
				}
			}

			updateSizes();
			window.addEventListener('resize', updateSizes);

			//Code that has to be executed "inline"
			function increaseVolume() {
				let vol = player.getVolume();
				if (player.isMuted()) {
					//Treat volume as 0
					vol = 0;
					player.unMute();
				}

				vol += 5;
				vol = (vol > 100 ? 100 : vol);
				player.setVolume(vol);
			}

			function lowerVolume() {
				let vol = player.getVolume();
				if (!player.isMuted()) {
					vol -= 5;
					
					vol = (vol < 0 ? 0 : vol);
					player.setVolume(vol);
				}
			}

			function showVolumeBar() {
				const volume = player.getVolume()
				localStorage.setItem('volume', volume);
				volumeBarNumber.innerHTML = volume;
				volumeBarBar.style.transform = `scaleX(${volume / 100})`;
				volumeBar.classList.add('visible');
				if (volumeBarTimeout !== null) {
					window.clearTimeout(volumeBarTimeout);
				}
				volumeBarTimeout = window.setTimeout(() => {
					volumeBar.classList.remove('visible');
					volumeBarTimeout = null;
				}, 2000);
			}

			function onScroll(isDown) {
				if (isDown) {
					lowerVolume();
				} else {
					increaseVolume();
				}
				showVolumeBar();
			}

			function addListeners() {
				var videoEl = document.querySelector('video');
				videoEl.addEventListener('wheel', (e) => {
					onScroll(e.deltaY > 0);
				});
				let prevVolume = localStorage.getItem('volume');
				prevVolume = (prevVolume === 0 ? 0 : prevVolume || 100);
				player.setVolume(prevVolume);
			}

			addListeners();

			function executeTask(name, id) {
				let result = null;
				switch (name) {
					case 'getTime':
						const time = document.querySelector('.html5-video-player').getCurrentTime();
						result = time;
						break;
					default:
						if (name.indexOf('getSongName') > -1) {
							let timestampContainers = document
								.querySelector('#eow-description')
								.querySelectorAll('a[href="#"]')
							const index = ~~name.split('getSongName')[1];
							const textNodes = [];
							let currentNode = timestampContainers[index].previousSibling;

							//Search back until a <br> is found
							while (currentNode.tagName !== 'BR') {
								if (!currentNode.tagName) {
									textNodes.push(currentNode.nodeValue);
								}
								currentNode = currentNode.previousSibling;
							}

							currentNode = timestampContainers[index].nextSibling;

							//Search forward until a <br> is found
							while (currentNode.tagName !== 'BR') {
								if (!currentNode.tagName) {
									textNodes.push(currentNode.nodeValue);
								}
								currentNode = currentNode.nextSibling;
							}

							//Go through list and find something that resembles a song
							for (let i = 0; i < textNodes.length; i++) {
								if (/.+-.+/.test(textNodes[i])) {
									//This is a song
									result = textNodes[i];
									break;
								}
							}

							if (!result) {
								//Just try this instead
								result = textNodes[0];
							}
						}
						break;
				}

				localStorage.setItem(`taskResult${id}`, result);
			}

			function checkForTasks() {
				let tasks;
				if ((tasks = localStorage.getItem('tasks'))) {
					try {
						tasks = JSON.parse(tasks);
					} catch(e) {
						tasks = [];
					}
					if (Array.isArray(tasks) && tasks.length > 0) {
						tasks.forEach((task) => {
							executeTask(task.name, task.id);
						});
						localStorage.setItem('tasks', '[]');
					}
				}
			}

			window.setInterval(checkForTasks, 50);
		});
	}

	view.addEventListener('contentload', (e) => {
		loadResizer();
	});

	view.addEventListener('loadcommit', (e) => {
		if (e.isTopLevel) {
			loadResizer();
		}
	})

	view.addEventListener('newwindow', (e) => {
		window.open(e.targetUrl, '_blank');
	})

	window.addEventListener('focus', () => {
		view.focus();
	});

	view.addEventListener('keydown', (e) => {
		if (e.key === '?') {
			window.getCurrentSong();
		}
	});

	addRuntimeListeners(view);
}

function setup(url) {
	const view = document.createElement('webview');
	view.id = 'mainView';
	view.setAttribute('partition', 'persistent:youtube-music-app');

	addViewListeners(view);

	view.src = url;
	document.body.appendChild(view);
}

function setupMenuButtons() {
	const app = chrome.app.window.current();
	const titleBar = document.querySelector('#titleBar');

	function updateButtonsState() {
		if (app.isMaximized()) {
			titleBar.classList.add('fullscreen');
		} else {
			titleBar.classList.remove('fullscreen');
		}
	}

	app.onMaximized.addListener(updateButtonsState);
	app.onRestored.addListener(updateButtonsState);
	window.addEventListener('focus', () => {
		titleBar.classList.add('focused');
	});
	window.addEventListener('blur', () => {
		titleBar.classList.remove('focused');
	});

	document.querySelector('#minimize').addEventListener('click', () => {
		app.minimize();
	});
	document.querySelector('#maximize').addEventListener('click', () => {
		if (app.isMaximized()) {
			app.restore();
		} else {
			app.maximize();
		}
	});
	document.querySelector('#close').addEventListener('click', () => {
		//Save progress
		const webviewUrl = document.querySelector('#mainView').executeScript({
			code: `(${(() => {
				const vidId = location.href.split('v=')[1].split('&')[0];
				let vidIndex = location.href.split('index=')[1];
				if (vidIndex.indexOf('&') > -1) {
					vidIndex = vidIndex.split('&')[0];
				}
				const [mins, secs] = document.querySelector('.ytp-time-current').innerHTML.split(':');
				const address = 'https://www.youtube.com/watch';
				const url = `${address}?v=${vidId}&list=WL&index=${vidIndex}&t=${mins}m${secs}s`;
				chrome.runtime.sendMessage({
					cmd: 'setUrl',
					url: url
				});
			}).toString()})()`
		});

		window.setTimeout(() => {
			app.close();
		}, 0);
	});
}

let songFoundTimeout = null;
let songFoundName = '';
function downloadSong() {
	//Search for it on youtube
	const view = document.createElement('webview');
	view.id = 'youtubeSearchPageView';

	view.addContentScripts([{
		name: 'youtubeSearchJs',
		matches: ['*://*/*'],
		js: {
			files: ['/youtubeSearch/youtubeSearch.js']
		},
		run_at: 'document_end'
	}, {
		name: 'youtubeSearchCss',
		matches: ['*://*/*'],
		css: {
			files: ['/youtubeSearch/youtubeSearch.css']
		},
		run_at: "document_start"
	}]);

	view.src = `https://www.youtube.com/results?search_query=${
		encodeURIComponent(songFoundName.trim().replace(/ /g, '+')).replace(/%2B/g, '+')
	}&page=&utm_source=opensearch`;
	document.body.appendChild(view);
}
document.getElementById('getSongDownload').addEventListener('click', downloadSong);
document.body.addEventListener('keydown', (e) => {
	if (e.key === 'd') {
		downloadSong();
	} else if (e.key === 'Escape') {
		document.getElementById('youtubeSearchPageView').remove();
	}
});

function displayFoundSong(name) {
	document.getElementById('getSongName').innerHTML = name;
	const dialog = document.getElementById('getSongDialog');
	dialog.classList.add('visible');
	dialog.classList.add('hoverable');
	if (songFoundTimeout !== null) {
		window.clearTimeout(songFoundTimeout);
	}
	songFoundName = name;
	songFoundTimeout = window.setTimeout(() => {
		dialog.classList.remove('visible');
		window.setTimeout(() => {
			dialog.classList.remove('hoverable');
		}, 200);
	}, 5000);
}

window.getCurrentSong = () => {
	sendTaskToPage('getTimestamps', (timestamps) => {
		if (!timestamps) {
			//Do some OCR magic
			
		} else {
			function getSongIndex(time) {
				for (let i = 0; i < timestamps.length; i++) {
					if (timestamps[i] <= time && timestamps[i + 1] >= time) {
						return i;
					}
				}
				return timestamps.length - 1;
			}

			sendTaskToPage('getTime', (time) => {
				const index = getSongIndex(~~time);
				sendTaskToPage('getSongName' + index, (name) => {
					displayFoundSong(name);
				});
			});
		}
	});
}

window.updateColors = (color) => {
	document.querySelector('#titleBar').style.backgroundColor = `rgb(${color})`;
}

window.downloadVideo = (url) => {
	document.getElementById('youtubeSearchPageView').remove();

	window.open(`http://www.youtube-mp3.org/#v${url.split('?v=')[1]}`, '_blank')
}

setupMenuButtons();
chrome.runtime.sendMessage({
	cmd: 'getUrl'
}, (response) => {
	if (response && response.url) {
		setup(response.url);
	} else {
		chrome.storage.sync.get('url', (data) => {
			setup(data.url);
		});
	}
})