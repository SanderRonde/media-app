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
			files: [
			 	//'/content/tesseract.js',
				'/content/comm.js',
				'/content/content.js'
			],
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
			if (window.exuectedYTCA === location.href) {
				return;
			}
			window.exuectedYTCA = location.href;

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
				setTimeout(() => {
					function reloadIfAd() {
						if (player.getAdState() === 1) {
							window.location.reload();
						}

						if (player.getPlayerState() === 3) {
							window.setTimeout(reloadIfAd, 250);
						} else {
							player.setPlaybackQuality('hd1080');
							if (player.getPlaybackQuality() !== 'hd1080') {
								player.setPlaybackQuality('hd720');
							}
							
							if (document.querySelector('.ytp-size-button')
									.getAttribute('title') === 'Theatermodus') {
								player.setSizeStyle(true, true);
							}
						}
					}
					reloadIfAd();
				}, 2500);
			}

			prepareVideo();

			document.body.addEventListener('keydown', (e) => {
				if (e.key === 'h') {
					//Hide or show video
					document.body.classList.toggle('showHiddens');
				}
			});

			function updateSizes() {
				playerApi.style.width = window.innerWidth + 'px';
				playerApi.style.height = (window.innerHeight - 15) + 'px';

				player.setSize();
			}

			updateSizes();
			window.addEventListener('resize', updateSizes);

			function setPlayerVolume(volume) {
				player.setVolume(volume);

				localStorage.setItem('yt-player-volume', JSON.stringify({
					data: JSON.stringify({
						volume: volume,
						muted: (volume === 0)
					}),
					creation: Date.now(),
					expiration: Date.now() + (30 * 24 * 60 * 60 * 1000) //30 days
				}));
			}

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
				setPlayerVolume(vol);
			}

			function lowerVolume() {
				let vol = player.getVolume();
				if (!player.isMuted()) {
					vol -= 5;
					
					vol = (vol < 0 ? 0 : vol);
					setPlayerVolume(vol);
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
			window.setTimeout(loadResizer, 1000);
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
	view.setAttribute('partition', 'persist:youtube-music-app');

	addViewListeners(view);

	view.src = url;
	document.body.appendChild(view);
}

function setupMenuButtons() {
	const app = chrome.app.window.current();
	const titleBar = document.querySelector('#titleBar');

	function updateButtonsState() {
		titleBar.classList[app.isMaximized() ? 'add' : 'remove']('maximized');
		titleBar.classList[app.isFullscreen() ? 'add' : 'remove']('fullscreen');
	}

	app.onMaximized.addListener(updateButtonsState);
	app.onRestored.addListener(updateButtonsState);
	app.onFullscreened.addListener(updateButtonsState);
	window.addEventListener('focus', () => {
		titleBar.classList.add('focused');
	});
	window.addEventListener('blur', () => {
		titleBar.classList.remove('focused');
	});

	document.querySelector('#fullscreen').addEventListener('click', () => {
		app[app.isFullscreen() ? 'restore' : 'fullscreen']();
	});
	document.querySelector('#minimize').addEventListener('click', () => {
		app.minimize();
	});
	document.querySelector('#maximize').addEventListener('click', () => {
		app[app.isMaximized() ? 'restore' : 'maximize']();
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

function handleEscapePress(index) {
	if (escapePresses >= 3) {
		//Close app
		const app = chrome.app.window.current();
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
		return;
	}

	window.setTimeout(() => {
		//Remove it from the array
		escapePresses--; 	
	}, 1000);
}

let escapePresses = 0;
document.body.addEventListener('keydown', (e) => {
	if (e.key === 'd') {
		downloadSong();
	} else if (e.key === 'Escape') {
		const youtubeSearchPageView = document.getElementById('youtubeSearchPageView');
		if (youtubeSearchPageView) {
			youtubeSearchPageView.remove();
			return;
		}

		escapePresses++
		handleEscapePress();
	} else if (e.key === 'F11') {
		chrome.runtime.sendMessage({
			cmd: 'toggleFullscreen'
		});
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

function getSongFromOCR(callback) {
	chrome.storage.local.get('imageModel', (data) => {
		let imageModelData = data.imageModel;

		sendTaskToPage('getImageOCR', (snapshotData) => {
			snapshotData = JSON.parse(snapshotData);
			//Get the most-occurring "model"

			//Try to find models where there is a big difference in confidence
			//between a few words that keep changing between models

			//First filter out noise by finding "words" that keeps sharing position
			const words = [];
			imageModelData.forEach((snapshot) => {
				snapshot.words.forEach((snapshotWord) => {
					words.push({
						text: snapshotWord.text,
						confidence: snapshotWord.confidence,
						bbox: snapshotWord.bbox,
						choices: snapshotWord.choises
					})
				});
			});

			//Group same "words" together
			const wordPos = {};
			words.forEach((word) => {
				const key = JSON.stringify({
					text: word.text,
					bbox: word.bbox
				});
				wordPos[key] = ~~wordPos[key] + 1;
			});

			//Now filter out any sections that do not contain at least the 3 most popular words
			let wordPosArr = [];
			for (let word in wordPos) {
				if (wordPos.hasOwnProperty(word)) {
					wordPosArr.push({
						word: JSON.parse(word),
						amount: wordPos[word]
					});
				}
			}
			wordPosArr = wordPosArr.sort((a, b) => {
				return a.amount - b.amount;
			}).slice(0, 2);
			imageModelData = imageModelData.filter((snapshot) => {
				for (let i = 0; i < snapshot.words.length; i++) {
					let found = false;
					wordPosArr.forEach((mostPopularWord) => {
						if (snapshot.words[i].text === mostPopularWord.word.text && 
							JSON.stringify(snapshot.words[i].bbox) === JSON.stringify(mostPopularWord.word.bbox)) {
							found = true;
						} 
					});
					if (found) {
						return true;
					}
				}
				return false;
			});

			//In theory these should all be the same except for a few lines so put all lines in an obj and count
			const lineAmounts = {};
			imageModelData.forEach((snapshot) => {
				snapshot.lines.forEach((snapshotLine) => {
					lineAmounts[snapshotLine.text] = ~~lineAmounts[snapshotLine.text] + 1;
				});
			});

			//Remove everything that is always present
			let lineAmountsArr = [];
			for (let lineText in lineAmounts) {
				if (lineAmounts.hasOwnProperty(lineText)) {
					lineAmountsArr.push({
						text: lineText,
						amount: lineAmounts[lineText]
					});
				}
			}

			lineAmountsArr = lineAmountsArr.filter((line) => {
				if (line.amount === data.length) {
					//Filter this line from the snapshot we just took
					snapshotData.lines.filter((dataLine) => {
						return dataLine.text !== line.text;
					});
				}
				return line.amount !== data.length;
			});

			//The remaining lines should be unique across slides

			//Now these lines also can contain some words that always exist in them, so repeat the process
			const lineWordAmounts = {};
			lineAmountsArr.forEach((snapshotLine) => {
				console.log(snapshotLine);
				snapshotLine.words.forEach((snapshotWord) => {
					lineWordAmounts[snapshotWord.text] = ~~lineWordAmounts[snapshotWord.text] + 1;
				});
			});

			//Remove everything that is always present
			let lineWordAmountsArr = [];
			for (let lineWord in lineWordAmounts) {
				if (lineWordAmounts.hasOwnProperty(lineWord)) {
					lineWordAmountsArr.push({
						text: lineWord,
						amount: lineWordAmounts[lineWord]
					});
				}
			}

			const snapshotWords = snapshotData.lines.map((snapshotLine) => {
				return snapshotLine.words.map((snapshotLineWord) => {
					return snapshotLineWord.text;
				});
			}).reduce((a, b) => {
				return a.concat(b);
			});
			lineWordAmountsArr = lineWordAmountsArr.filter((word) => {
				if (line.amount === data.length) {
					//Filter this word from the words in the snapshot we just took
					snapshotWords.splice(snapshotWords.indexOf(word.text), 1);
				}

				return word.amount !== data.length;
			});

			//Remaining words should be the song's name
			callback(snapshotWords);
		});
	});
}

function timestampToSeconds(timestamp) {
	const split = timestamp.split(':');
	let seconds = 0;
	for (let i = split.length - 1; i >= 0; i--) {
		seconds = Math.pow(60, (split.length - (i + 1))) * ~~split[i];
	}
	return seconds;
}

function getSongIndex(timestamps, time) {
	for (let i = 0; i < timestamps.length; i++) {
		if (timestamps[i] <= time && timestamps[i + 1] >= time) {
			return i;
		}
	}
	return timestamps.length - 1;
}

window.getCurrentSong = () => {
	sendTaskToPage('getTimestamps', (timestamps) => {
		const enableOCR = false;
		if (enableOCR && !timestamps) {
			//Do some OCR magic
			getSongFromOCR(displayFoundSong);
		} else if (!Array.isArray(timestamps)) {
			//It's a link to the tracklist
			fetch(timestamps).then((response) => {
				return response.text();
			}).then((html) => {
    			const doc = document.createRange().createContextualFragment(html);
				const tracks = Array.from(doc.querySelectorAll('.tlpTog')).map((songContainer) => {
					const nameContainer = songContainer.querySelector('.trackFormat.iBlock');
					const namesContainers = nameContainer.querySelectorAll('.blueTxt, .blackTxt');
					const artist = namesContainers[0].childNodes[0].nodeValue; 
					const songName = namesContainers[1].childNodes[0].nodeValue;
					return {
						startTime: timestampToSeconds(songContainer.querySelector('.cueValueField').innerText),
						songName: `${artist} - ${songName}`
					}
				});

				sendTaskToPage('getTime', (time) => {
					const index = getSongIndex(tracks.map((track) => {
						return track.startTime;
					}), ~~time);
					displayFoundSong(tracks[index].songName);
				});
			});
		} else {
			sendTaskToPage('getTime', (time) => {
				const index = getSongIndex(timestamps, ~~time);
				sendTaskToPage('getSongName' + index, (name) => {
					displayFoundSong(name);
				});
			});
		}
	});
}

window.downloadVideo = (url) => {
	document.getElementById('youtubeSearchPageView').remove();
	window.open(`http://www.youtube-mp3.org/#v${url.split('?v=')[1]}`, '_blank')
}

window.respondUrl = (response) => {
	if (response && typeof response === 'string') {
		setup(response);
	} else {
		chrome.storage.sync.get('url', (data) => {
			setup(data.url);
		});
	}
}

setupMenuButtons();
chrome.runtime.sendMessage({
	cmd: 'getUrl'
});