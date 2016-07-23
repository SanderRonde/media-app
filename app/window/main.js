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

	view.addEventListener('newwindow', (e) => {
		window.open(e.targetUrl, '_blank');
	})

	window.addEventListener('focus', () => {
		view.focus();
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