let app = null;

function launch(view) {
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
	}, (appWindow) => {
		app = appWindow; 
		if (view) {
			appWindow.contentWindow.baseView = view;
		}

		try {
			app.onClosed.addListener(() => {
				app = null;
			});
		} catch(e) {
			//If an error occured during the adding of this listener,
			// that means the window was already closed, so set it to null
			app = null;
		}
	});
}

chrome.app.runtime.onLaunched.addListener(() => {
	launch('ytmusic');
});

chrome.commands.onCommand.addListener((cmd) => {
	switch (cmd) {
		case 'launchYoutubeMusic':
			launch('ytmusic');
			break;
		case 'launchNetflix':
			launch('netflix');
			break;
		case 'launchYoutubeSubscriptions':
			launch('youtubeSubscriptions');
			break;
		case 'launch':
			launch('ytmusic');
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
			if (getApp() === null) {
				launch('ytmusic');
			} else {
				chrome.runtime.sendMessage({
					cmd: 'pausePlay'
				});
			}
			break;
		case 'focusWindow':
			if (getApp() === null) {
				launch('ytmusic');
			} else {
				getApp().focus();
				getAppWindow().AppWindow.onFocus();
			}
			break;
		case 'magicButton':
			getAppWindow().AppWindow.onMagicButton();
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
	return app;
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
					getAppWindow().YoutubeMusic.respondUrl(response.url);
				});
			} catch(e) {
				chrome.storage.sync.get((data) => {
					getAppWindow().YoutubeMusic.respondUrl(data.url);
				});
			}
			break;
		case 'setUrl':
			try {
				port.postMessage({
					cmd: 'setUrl',
					url: message.url
				});
			} catch (e) {
				console.log('something went wrong saving the url', e);
			}
			break;
		case 'downloadvideo':
			getAppWindow().YoutubeMusic.downloadVideo(message.url);
			break;
		case 'taskResult':
			const appWindow = getAppWindow();
			appWindow.Helpers.returnTaskValue &&
				appWindow.Helpers.returnTaskValue(message.result, message.id);
			break;
		case 'toggleFullscreen':
			const app = getApp();
			if (app.isFullscreen()) {
				app.restore();
			} else {
				app.fullscreen();
			}
			break;
		case 'loadingCompleted':
			getAppWindow().AppWindow.onLoadingComplete(message.view);
			break;
		case 'changeNetflixUrl':
			debugger;
			getAppWindow().Netflix.changeVideo(message.url);
			break;
		case 'changeYoutubeSubsLink':
			getAppWindow().YoutubeSubscriptions.changeVideo(message.link);
			break;
	}
});