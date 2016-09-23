const url = 'https://www.netflix.com/browse';
window.setInterval(() => {
	if (location.href !== url) {
		chrome.runtime.sendMessage({
			cmd: 'changeNetflixUrl',
			url: location.href
		});
	}
	document.querySelector('player-back-to-browsing').click();
}, 50);