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
			chrome.runtime.sendMessage({
				cmd: 'getSong'
			});
			break;
	}
});

const port = chrome.runtime.connect('hkjjmhkhhlmkflpihbikfpcojeofbjgn');

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

chrome.runtime.onMessage.addListener((message, messageSender, respond) => {
	switch (message.cmd) {
		case 'getUrl':
			try {
				sendMessageToPlaylistSaver({
					cmd: 'getUrl'
				}, (response) => {
					respond(response.url);
				});
			} catch(e) {
				chrome.storage.sync.get((data) => {
					respond(data.url);
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
		case 'updateColor':
			chrome.app.window.get('mainwindow').contentWindow.updateColors(message.color);
			break;
	}
});