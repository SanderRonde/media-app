function launch() {
	chrome.app.window.create('window/main.html', {
		id: 'mainwindow',
		outerBounds: {
			width: 1280,
			height: 720	
		},
		frame: {
			type: 'none'
		},
		state: 'maximized',
		resizable: true
	});
}

chrome.app.runtime.onLaunched.addListener(() => {
	launch();
});

chrome.commands.onCommand.addListener((cmd) => {
	switch (cmd) {
		case 'launch':
			launch();
			break;
		case 'lowerVolume':
			chrome.runtime.sendMessage({
				cmd: 'lowerVolume'
			});
			break;
		case 'raiseVolume':
			chrome.runtime.sendMessage({
				cmd: 'raiseVolume'
			});
			break;
		case 'pausePlay':
			chrome.runtime.sendMessage({
				cmd: 'pausePlay'
			});
			break;
		case 'focusWindow':
			chrome.app.window.get('mainwindow').focus();
			break;
		case 'getSong':
			let appWindow = chrome.app.window.get('mainwindow');
			appWindow.focus();
			appWindow.contentWindow.getCurrentSong();
			break;
	}
});

const port = chrome.runtime.connect('oahihanjdfabhkcjhoppkifbinfplkad');

function generateSingleCb(cb, remove) {
	return (message) => {
		remove();
		cb(message);
	}
}

function sendMessageToPlaylistSaver(message, cb) {
	var listener;
	listener = generateSingleCb(cb, () => {
		port.onMessage.removeListener(listener);
	})
	port.onMessage.addListener(listener);
	port.postMessage(message);
}

function getApp() {
	return chrome.app.window.get('mainwindow');
}

function getAppWindow() {
	return getApp().contentWindow;
}

chrome.runtime.onMessage.addListener((message, messageSender, respond) => {
	switch (message.cmd) {
		case 'getUrl':
			try {
				sendMessageToPlaylistSaver({
					cmd: 'getUrl'
				}, (response) => {
					getAppWindow().respondUrl(response.url);
				});
			} catch(e) {
				chrome.storage.sync.get((data) => {
					getAppWindow(data.url);
				});
			}
			break;
		case 'setUrl':
			try {
				port.postMessage({
					cmd: 'setUrl',
					url: message.url
				});
			} catch (e) {}
			break;
		case 'downloadvideo':
			getAppWindow().downloadVideo(message.url);
			break;
		case 'taskResult':
			const appWindow = getAppWindow();
			appWindow.returnTaskValue && appWindow.returnTaskValue(message.result, message.id);
			break;
		case 'toggleFullscreen':
			const app = getApp();
			if (app.isFullscreen()) {
				app.restore();
			} else {
				app.fullscreen();
			}
			break;
	}
});