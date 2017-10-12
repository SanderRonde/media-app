import { EmbeddableSendType, OnTaskType } from '../../../../backgroundLibs/msg/msg';
import { CommWindow } from '../../../libs/comm';

declare var sendMessage: EmbeddableSendType;
declare var onTask: OnTaskType;
declare const window: YoutubeContentWindow;

interface YoutubeContentWindow extends CommWindow {
	saveProgress(): void;
}

(() => {
	function saveNewUrl(url: string) {
		sendMessage('toWindow', 'saveUrl', url);
	}

	window.saveProgress = () => {
		const vidId = location.href.split('v=')[1].split('&')[0];
		let vidIndex = location.href.split('index=')[1];
		if (vidIndex.indexOf('&') > -1) {
			vidIndex = vidIndex.split('&')[0];
		}
		const [secs, mins, hours] = document.querySelector('.ytp-time-current').innerHTML.split(':').reverse();
		const address = 'https://www.youtube.com/watch';
		const url = `${address}?v=${vidId}&list=WL&index=${vidIndex}&t=${
			~~secs + ((~~mins + (~~hours * 60)) * 60)
		}`;
		
		saveNewUrl(url);
	};

	const canv = document.createElement('canvas');
	canv.width = 1280;
	canv.height = 720;
	const ctx = canv.getContext('2d');

	function updateColors() {
		ctx.drawImage(document.querySelector('video'), 0, 0, canv.width, canv.height);
		const uri = canv.toDataURL('image/png');
		const img = document.createElement('img');
		img.src = uri;	
		
		const usedColors: {
			[key: string]: number;
		} = {};
		[
			ctx.getImageData(0, 0, canv.width, 2).data,
			ctx.getImageData(0, canv.height - 2, canv.width, 2).data,
			ctx.getImageData(0, 2, 2, canv.height - 4).data,
			ctx.getImageData(canv.width - 4, 2, 2, canv.height - 4).data
		].forEach((dataSet) => {
			for (let i = 0; i < dataSet.length; i += 4) {
				const str = `${dataSet[i]},${dataSet[i + 1]},${dataSet[i + 2]}`;
				usedColors[str] = (
					usedColors[str] ? usedColors[str] + 1 : 1
				);
			}
		});

		//Turn obj into array
		let mostUsedColor = 'rgb(255,255,255)';
		let mostUsedColorCount = 0;
		for (let color in usedColors) {
			if (usedColors.hasOwnProperty(color)) {
				if (usedColors[color] > mostUsedColorCount) {
					mostUsedColor = color;
					mostUsedColorCount = usedColors[color];
				}
			}
		}

		document.querySelector('video').style.backgroundColor = `rgb(${mostUsedColor})`;
	}

	onTask('getTimestamps', (() => {
		const descr = document.querySelector('#description');
		const timestampContainers = Array.from(descr.querySelectorAll('a[href="#"]')).filter((timestamp) => {
			return /(\d)\:(\d)(:(\d))*/.test(timestamp.innerHTML);
		});
		let timestamps = null;
		if (timestampContainers.length > 4) {
			//At least 5 songs should be played to make it a tracklist
			timestamps = timestampContainers.map((timestamp) => {
				const split = timestamp.innerHTML.split(':');
				let seconds = 0;
				for (let i = split.length - 1; i >= 0; i--) {	
					seconds += Math.pow(60, (split.length - (i + 1))) * ~~split[i];
				}
				return seconds;
			});
			return {
				found: true,
				data: timestamps
			};
		} else {
			//Try to find any links to 1001tracklists in the description
			const tracklistLinks = Array.from(descr.querySelectorAll('a')).map((anchor) => {
				if (anchor.getAttribute('href').match(/http(s)?:\/\/www\.1001tracklists\.com\/tracklist\//)) {
					return anchor.getAttribute('href');
				} 
				return null;
			}).filter((anchor) => {
				return anchor !== null;
			});

			if (tracklistLinks.length > 0) {
				return {
					found: true,
					data: tracklistLinks[0]
				};
			} else {
				return {
					found: false,
					data: {
						url: location.href,
						name: document.title
					}
				};
			}
		}
	}) as any);

	onTask('getTime', () => {
		return new Promise((resolve) => {
			window.commToPage('getTime', null, (result) => {
				resolve(result);
			});
		});
	});

	onTask('getSongName', (data) => {
		return new Promise((resolve) => {
			window.commToPage('getSongName', null, (result) => {
				resolve(result);
			});
		});
	});

	document.querySelector('video').style.transition = `background-color 500ms linear`;
	window.setInterval(updateColors, 1e4);
	updateColors();
	window.setInterval(window.saveProgress, 5e3);
})();