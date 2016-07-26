Array.from(document.querySelectorAll('.item-section')).forEach((item) => {
	item.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();

		//Get the LI element
		let pathIndex = 0;
		let el = e.path[pathIndex];
		while (el.tagName !== 'LI') {
			el = e.path[++pathIndex];
		}

		//Get this URL and open it
		chrome.runtime.sendMessage({
			cmd: 'downloadvideo',
			url: el.querySelector('.yt-uix-sessionlink').getAttribute('href')
		});
	});
});