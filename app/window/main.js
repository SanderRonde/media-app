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
			files: ['/content/content.js'],
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
							if (player.getPlayerState() === 3) {
								window.setTimeout(resizeWhenReady, 500);
							} else {
								player.setSizeStyle(true, true);
							}
						}
						resizeWhenReady();
					}
					console.log('after');
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
});

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