window.setTimeout(() => {
	const profiles = document.querySelectorAll('.choose-profile > .profile');
	if (profiles.length > 0) {
		profiles[0].childNodes[0].click();
		window.setTimeout(() => {
			localStorage.setItem('loaded', 'netflix');
		}, 2000);
	} else {
		localStorage.setItem('loaded', 'netflix');
	}
}, 1000);