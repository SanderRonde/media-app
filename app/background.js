function launch() {
	chrome.app.window.create('window/main.html', {
		id: 'mainwindow',
		outerBounds: {
			width: 1280,
			height: 720	
		},
		frame: 'chrome',
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
	}
});