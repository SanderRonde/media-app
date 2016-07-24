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

			function updateSizes() {
				playerApi.style.width = window.innerWidth + 'px';
				playerApi.style.height = (window.innerHeight - 5) + 'px';

				player.setSize();
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
		}
	});
}

function setup(url) {
	const view = document.createElement('webview');
	view.id = 'mainView';
	view.style.width = '100vw';
	view.style.height = '100vh';
	view.setAttribute('partition', 'persistent:youtube-music-app');

	addViewListeners(view);

	view.src = url;
	document.body.appendChild(view);
}

chrome.storage.sync.get('url', (data) => {
	const url = data.url;

	setup(url);
});