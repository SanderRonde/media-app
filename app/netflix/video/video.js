function loadLastWatchedVideo() {
	const sliders = document.querySelectorAll('.sliderContent');
	
	//Click the first slider's first element
	sliders[0].childNodes[0].querySelector('.title_card').click();
	window.setTimeout(() => {
		document.querySelector('.playRing').click();
		localStorage.setItem('loaded', 'netflix');
	}, 1000);
}


window.setTimeout(() => {
	const profiles = document.querySelectorAll('.choose-profile > .profile');
	console.log(profiles);
	if (profiles.length > 0) {
		profiles[0].childNodes[0].click();
		console.log('still there');
		console.log(location.href);
		window.setTimeout(loadLastWatchedVideo, 2500);
	} else {
		loadLastWatchedVideo();
	}
}, 1000);