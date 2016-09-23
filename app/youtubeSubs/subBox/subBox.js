let videos = null;
const PODCAST_VIDS = [
	'No Xcuses',
	'Darklight Sessions',
	'WE R Hardstyle',
	'Front Of House Radio',
	'Star Track Radio',
	'Corsten\'s Countdown',
	'Protocol Radio',
	'Monstercat Podcast',
	'Revealed Radio',
	'Hardwell On Air',
	'Heldeep Radio',
	'Heartfeldt Radio',
	'Clublife by Tiësto',
	'Spinnin\' Sessions',
	'Aoki\'s House',
	'Hysteria Radio',
	'A State of Trance',
	'Monstercat Podcast',
	'Future of Euphoric Stylez - ',
	'Phreshcast',
	'HARD with STYLE'
];

class SelectedVideo {
	_focusCurrent() {
		this.current.classList.add('selectedVideo');
		window.scrollTop = (this.current.getBoundingClientRect().top + 80) + 
			(window.innerHeight / 2);
	}

	_deselectCurrent() {
		this.current.classList.remove('selectedVideo');
	}

	goLeft() {
		this._deselectCurrent();
		this.current = this.videos.indexOf(this.current) - 1;
		this._focusCurrent();
	}

	goRight() {
		this._deselectCurrent();
		this.current = this.videos.indexOf(this.current) + 1;
		this._focusCurrent();
	}

	selectLastWatched() {
		//Select last watched video or last in general
		for (let i = 0; i < videos.length; i++) {
			if (videos[i].watched && !videos[i].isHidden) {
				this.current = videos[i];
			}
		}
		if (!this.current) {
			this.current = videos[videos.length - 1];
		}
	}

	constructor(videos, previousTitle) {
		this.videos = videos;

		if (previousTitle) {
			for (let i = 0; i < videos.length; i++) {
				if (videos[i].title === previousTitle) {
					this.current = videos[i];
					break;
				}
			}
		}
		if (!this.current) {
			this.selectLastWatched();
		}

		this._highlightCurrent();
	}
}

class VideoIdentifier {
	_objectify(video) {
		return {
			video: video
		};
	}

	_markWatched(video) {
		video.watched = !!video.querySelector('.watched-badge')
	}

	_setVideoMetaData(video) {
		video.title = video.querySelector('.yt-lockup-title').querySelector('a').innerText;
		const length = video.querySelector('.video-time').innerText;
		const [seconds, minutes, hours] = length.split(':').reverse();
		video.length = {
			hours: parseInt(hours, 10) || 0,
			minutes: parseInt(minutes, 10) || 0,
			seconds: parseInt(seconds, 10) || 0
		};
		video.length.totalMinutes = video.length.minutes + (video.length.minutes * 60);
		video.length.totalSeconds = video.length.seconds + (video.length.totalMinutes * 60);
	}

	_hideVideo(video) {
		video.style.display = 'none';
	}

	_addPocastToWatchLater(video) {
		for (let i = 0; i < PODCAST_VIDS.length; i++) {
			if (video.title.indexOf(PODCAST_VIDS[i]) > -1) {
				video.isPodcast = true;
				this._hideVideo(video);
				video.isHidden = true;
				return;
			}
		}
		video.isPodcast = false;
	}

	_markPossiblePocast(video) {
		if (!video.isHidden) {
			if (video.length.totalMinutes > 50) {
				video.isPossiblePodcast = true;
			}
		}
	}

	_applyArrayTransformation(arr, fns) {
		for (let i = 0; i < fns.length; i++) {
			arr = arr.map(fns[i]);
		}
		return arr;
	}

	_replaceLinks(videos) {
		videos.forEach((video) => {
			const anchors = video.querySelectorAll('a');
			anchors.forEach((anchor) => {
				if (!anchor.hasListener) {
					const link = anchor.href;
					anchor.href = `javascript:window.navToLink(${link})`;
					anchor.hasListener = true;
				}
			});
		});
	}

	constructor(videos) {
		this.videos = this._applyArrayTransformation(videos,
			[
				this._objectify,
				this._markWatched,
				this._setVideoMetaData,
				this._addPocastsToWatchLater,
				this._markPossiblePocast
			]);
		this.selected = SelectedVideo(this.videos, (
			videos && videos.selected && videos.selected.current && videos.selected.current.title
		) || null);

		this._replaceLinks(this.videos);
	}
}

function identifyVideos() {
	const vids = document.querySelectorAll('.yt-lockup-video');
	if (!videos || videos.getAmount !== vids.length) {
		videos = new VideoIdentifier(vids);
	}
}

window.navToLink = (link) => {
	chrome.runtime.sendMessage({
		cmd: 'changeYoutubeSubsLink',
		link: link
	});
}

window.setInterval(identifyVideos, 100);
identifyVideos();

window.addEventListener('keydown', (e) => {
	switch (e.key) {
		case 'l':
			videos.selected.selectLastWatched();
			break;
		case 'ArrowLeft':
			videos.selected.goleft();
			break;
		case 'ArrowRight':
			videos.selected.goRight();
			break;
	}
});