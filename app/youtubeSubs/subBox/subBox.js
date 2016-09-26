window.videos = null;
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
	'HARD with STYLE',
	'Global Dedication',
	'Flashover Radio'
];

let watchedSelected = 0;

const bezFn = (() => {
	/**
	 * https://github.com/gre/bezier-easing
	 * BezierEasing - use bezier curve for transition easing function
	 * by Gaëtan Renaudeau 2014 - 2015 – MIT License
	 */

	// These values are established by empiricism with tests (tradeoff: performance VS precision)
	var NEWTON_ITERATIONS = 4;
	var NEWTON_MIN_SLOPE = 0.001;
	var SUBDIVISION_PRECISION = 0.0000001;
	var SUBDIVISION_MAX_ITERATIONS = 10;

	var kSplineTableSize = 11;
	var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

	var float32ArraySupported = true;

	function _A(aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
	function _B(aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1; }
	function _C(aA1) { return 3.0 * aA1; }

	// Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
	function _calcBezier(aT, aA1, aA2) { return ((_A(aA1, aA2) * aT + _B(aA1, aA2)) * aT + _C(aA1)) * aT; }

	// Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
	function _getSlope(aT, aA1, aA2) { return 3.0 * _A(aA1, aA2) * aT * aT + 2.0 * _B(aA1, aA2) * aT + _C(aA1); }

	function _binarySubdivide(aX, aA, aB, mX1, mX2) {
		var currentX, currentT, i = 0;
		do {
			currentT = aA + (aB - aA) / 2.0;
			currentX = _calcBezier(currentT, mX1, mX2) - aX;
			if (currentX > 0.0) {
				aB = currentT;
			} else {
				aA = currentT;
			}
		} while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
		return currentT;
	}

	function _newtonRaphsonIterate(aX, aGuessT, mX1, mX2) {
		for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
			var currentSlope = _getSlope(aGuessT, mX1, mX2);
			if (currentSlope === 0.0) {
				return aGuessT;
			}
			var currentX = _calcBezier(aGuessT, mX1, mX2) - aX;
			aGuessT -= currentX / currentSlope;
		}
		return aGuessT;
	}

	return {
		bezier: function(mX1, mY1, mX2, mY2) {
			if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
				throw new Error('bezier x values must be in [0, 1] range');
			}

			// Precompute samples table
			var sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
			if (mX1 !== mY1 || mX2 !== mY2) {
				for (var i = 0; i < kSplineTableSize; ++i) {
					sampleValues[i] = _calcBezier(i * kSampleStepSize, mX1, mX2);
				}
			}

			function getTForX(aX) {
				var intervalStart = 0.0;
				var currentSample = 1;
				var lastSample = kSplineTableSize - 1;

				for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
					intervalStart += kSampleStepSize;
				}
				--currentSample;

				// Interpolate to provide an initial guess for t
				var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
				var guessForT = intervalStart + dist * kSampleStepSize;

				var initialSlope = _getSlope(guessForT, mX1, mX2);
				if (initialSlope >= NEWTON_MIN_SLOPE) {
					return _newtonRaphsonIterate(aX, guessForT, mX1, mX2);
				} else if (initialSlope === 0.0) {
					return guessForT;
				} else {
					return _binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
				}
			}

			return function BezierEasing(x) {
				if (mX1 === mY1 && mX2 === mY2) {
					return x; // linear
				}
				// Because JavaScript number are imprecise, we should guarantee the extremes are right.
				if (x === 0) {
					return 0;
				}
				if (x === 1) {
					return 1;
				}
				return _calcBezier(getTForX(x), mY1, mY2);
			};
		}
	};
})();

const bezierCurve = bezFn.bezier(0.25, 0.1, 0.25, 1);
function getCurrentTarget(time, target) {
	return bezierCurve(time) * target;
}

function scroll(timestamp) {
	const data = this;

	if (data.startTime === null) {
		data.startTime = timestamp;
	}

	const passedTime = timestamp - data.startTime;

	if (passedTime >= data.maxTime) {
		window.scrollTo(0, data.to);
	} else {
		const currentTarget = getCurrentTarget(passedTime / data.maxTime,
			data.target);
		window.scrollTo(0, currentTarget + data.from);

		window.requestAnimationFrame(scroll.bind(data));
	}
}

function smoothScroll(to) {
	const currentScroll = document.body.scrollTop;

	const time = Date.now();
	const data = {
		from: currentScroll,
		to: to,
		target: to - currentScroll,
		progress: 0,
		maxTime: 250,
		startTime: null,
		lastAnimationFrame: time
	};

	//Do it in ~250ms
	window.requestAnimationFrame(scroll.bind(data));
}

class SelectedVideo {
	_focusCurrent() {
		this.current.element.classList.add('selectedVideo');
		smoothScroll(this.current.element.getBoundingClientRect().top +
			document.body.scrollTop - 302);
	}

	_deselectCurrent() {
		this.current && this.current.element.classList.remove('selectedVideo');
	}

	_updateSelected(video) {
		this._deselectCurrent();
		this.current = video;
		this._focusCurrent();
	}

	setCurrent(video) {
		this._updateSelected(video);
	}

	_getRowWidth() {
		if (this.rowWidth && this.rowWidth.width === window.innerWidth) {
			return this.rowWidth.amount;
		}

		let rowWidth = 1;
		const firstVidTop = this.videos[0].element.getBoundingClientRect().top - 
			document.body.getBoundingClientRect().top;

		while (this.videos[rowWidth++].element.getBoundingClientRect().top - 
			document.body.getBoundingClientRect().top === firstVidTop) {}
		rowWidth--;

		this.rowWidth = {
			width: window.innerWidth,
			amount: rowWidth
		}
		return rowWidth;
	}

	goUp() {
		let width = this._getRowWidth();
		let toSelect = this.current;
		for (let i = 0; i < width; i++) {
			do {
				toSelect = this.videos[this.videos.indexOf(toSelect) - 1];
			} while (!toSelect || toSelect.isHidden)
		}
		this._updateSelected(toSelect);
	}

	goDown() {
		let width = this._getRowWidth();
		let toSelect = this.current;
		for (let i = 0; i < width; i++) {
			do {
				toSelect = this.videos[this.videos.indexOf(toSelect) + 1];
			} while (!toSelect || toSelect.isHidden)
		}
		this._updateSelected(toSelect);
	}

	goLeft() {
		let toSelect = this.current;
		do {
			toSelect = this.videos[this.videos.indexOf(toSelect) - 1];
		} while (!toSelect || toSelect.isHidden)
		this._updateSelected(toSelect);
	}

	goRight() {
		let toSelect = this.current;
		do {
			toSelect = this.videos[this.videos.indexOf(toSelect) + 1];
		} while (!toSelect || toSelect.isHidden)
		this._updateSelected(toSelect);
	}

	launchCurrent() {
		window.navToLink(this.current.links[0]);
	}

	selectLatestWatched() {
		let foundSelected = watchedSelected;
		let newSelected = null;
		//Select latest watched video or last in general
		for (let i = 0; i < this.videos.length; i++) {
			if (this.videos[i].watched && !this.videos[i].isHidden) {
				newSelected = this.videos[i];
				if (foundSelected === 0) {
					this._updateSelected(newSelected)
					return;
				}
				foundSelected--;
			}
		}
		if (this.current) {
			return;
		}
		this._updateSelected(this.videos[this.videos.length - 1]);
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
			this.selectLatestWatched();
		}

		this._focusCurrent();

		if (!window.signalledCompletion) {
			localStorage.setItem('loaded', 'youtubeSubscriptions');
			window.signalledCompletion = true;
		}
	}
}

const toWatchLater = [];
let isHandlingWatchLater = false;
function clickWatchLater(deadline) {
	while (deadline.timeRemaining() > 0 && toWatchLater.length > 0 && toWatchLater[0]) {
		toWatchLater.pop().click();
	}

	if (toWatchLater.length > 0) {
		window.requestIdleCallback(clickWatchLater, {
			timeout: 10000
		});
	} else {
		isHandlingWatchLater = false;
	}
}

function addVideoToWatchLater(button) {
	toWatchLater.push(button);
	if (!isHandlingWatchLater) {
		isHandlingWatchLater = true;
		window.requestIdleCallback(clickWatchLater, {
			timeout: 10000
		});
	}
}

class VideoIdentifier {
	getAmount() {
		return this.videos.length;
	}

	_objectify(video) {
		return {
			element: video
		};
	}

	_markWatched(video) {
		video.watched = !!video.element.querySelector('.watched-badge')

		return video;
	}

	_setVideoMetaData(video) {
		video.title = video.element.querySelector('.yt-lockup-title').querySelector('a').innerText;
		return video;
	}

	_hideVideo(video) {
		video.element.parentNode.style.display = 'none';

		return video;
	}

	_addPocastToWatchLater(video) {
		for (let i = 0; i < PODCAST_VIDS.length; i++) {
			if (video.title.indexOf(PODCAST_VIDS[i]) > -1) {
				video.isPodcast = true;
				this._hideVideo(video);
				video.isHidden = true;
				addVideoToWatchLater(video.element.querySelector('.addto-watch-later-button'));
				return video;
			}
		}
		video.isPodcast = false;

		return video;
	}

	_applyArrayTransformation(arr, fns) {
		for (let i = 0; i < fns.length; i++) {
			arr = arr.map(fns[i]);
		}
		return arr;
	}

	_replaceLinks(videos) {
		videos.forEach((video) => {
			const anchors = video.element.querySelectorAll('a');
			video.links = [];
			anchors.forEach((anchor) => {
				if (!anchor.hasListener) {
					const link = anchor.href;
					anchor.href = '#';
					anchor.addEventListener('click', (e) => {
						window.navToLink(link, video);
					});
					anchor.hasListener = true;
					video.links.push(link);
				}
			});
		});
	}

	constructor(videos) {
		this.videos = this._applyArrayTransformation(Array.from(videos),
			[
				this._objectify.bind(this),
				this._markWatched.bind(this),
				this._setVideoMetaData.bind(this),
				this._addPocastToWatchLater.bind(this),
			]);
		this.selected = new SelectedVideo(this.videos, (
			videos && videos.selected && videos.selected.current && videos.selected.current.title
		) || null);

		this._replaceLinks(this.videos);
	}
}

function identifyVideos() {
	const vids = document.querySelectorAll('.yt-lockup-video');
	if (!window.videos || window.videos.getAmount() !== vids.length) {
		window.videos = new VideoIdentifier(vids);
	}
}

window.navToLink = (link, video) => {
	chrome.runtime.sendMessage({
		cmd: 'changeYoutubeSubsLink',
		link: link
	});
	if (video) {
		videos.selected.setCurrent(video);
	}
}

window.setInterval(identifyVideos, 100);
identifyVideos();

window.addEventListener('keydown', (e) => {
	switch (e.key) {
		case 'l':
			watchedSelected++;
			window.videos.selected.selectLatestWatched();
			break;
		case 'k':
			watchedSelected = watchedSelected - 1 || 0;
			window.videos.selected.selectLatestWatched();
			break;
		case 'ArrowLeft':
			window.videos.selected.goLeft();
			e.stopPropagation();
			e.preventDefault();
			break;
		case 'ArrowRight':
			window.videos.selected.goRight();
			e.stopPropagation();
			e.preventDefault();
			break;
		case 'ArrowUp':
			window.videos.selected.goUp();
			e.stopPropagation();
			e.preventDefault();
			break;
		case 'ArrowDown':
			window.videos.selected.goDown();
			e.stopPropagation();
			e.preventDefault();
			break;
		case 'Enter':
		case ' ': //Space... wtf is this google
			window.videos.selected.launchCurrent();
			e.stopPropagation();
			e.preventDefault();
			break;
	}
});