chrome.storage.sync.set({
	test: 'test'
});

window.saveProgress = () => {
	const vidId = location.href.split('v=')[1].split('&')[0];
	let vidIndex = location.href.split('index=')[1];
	if (vidIndex.indexOf('&') > -1) {
		vidIndex = vidIndex.split('&')[0];
	}
	const [mins, secs] = document.querySelector('.ytp-time-current').innerHTML.split(':');
	const address = 'https://www.youtube.com/watch';
	const url = `${address}?v=${vidId}&list=WL&index=${vidIndex}&t=${mins}m${secs}s`;
	
	chrome.runtime.sendMessage({
		cmd: 'setUrl',
		url: url
	});
}

const canv = document.createElement('canvas');
canv.width = 1280;
canv.height = 720;
const ctx = canv.getContext('2d');

function updateColors() {
	ctx.drawImage(document.querySelector('video'), 0, 0, canv.width, canv.height);
	const uri = canv.toDataURL('image/png');
	const img = document.createElement('img');
	img.src = uri;	
	
	const usedColors = {};
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

	chrome.runtime.sendMessage({
		cmd: 'updateColor',
		color: mostUsedColor
	});
	document.querySelector('video').style.backgroundColor = `rgb(${mostUsedColor})`;
}

window.setInterval(updateColors, 10000);
updateColors();
window.setInterval(window.saveProgress, 120000);