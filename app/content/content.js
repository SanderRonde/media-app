chrome.storage.sync.set({
	test: 'test'
});

function saveProgress() {
	const vidId = location.href.split('v=')[1].split('&')[0];
	let vidIndex = location.href.split('index=')[1];
	if (vidIndex.indexOf('&') > -1) {
		vidIndex = vidIndex.split('&')[0];
	}
	const [mins, secs] = document.querySelector('.ytp-time-current').innerHTML.split(':');
	const address = 'https://www.youtube.com/watch';
	const url = `${address}?v=${vidId}&list=WL&index=${vidIndex}&t=${mins}m${secs}s`;
	chrome.storage.sync.set({
		url: url
	});
}

window.setTimeout(saveProgress, 120000);