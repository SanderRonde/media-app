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

	document.querySelector('video').style.backgroundColor = `rgb(${mostUsedColor})`;
}

function uncirculizeWord(word) {
	return {
		bbox: word.bbox,
		text: word.text,
		confidence: word.confidence,
		choices: word.choices
	}
}

const imageModel = [];
function uploadImageModel(newData) {
	imageModel.push({
		lines: newData.lines.map((line) => {
			return {
				bbox: line.bbox,
				text: line.text,
				confidence: line.confidence,
				words: line.words.map(uncirculizeWord)
			}
		}),
		text: newData.text,
		words: newData.words.map(uncirculizeWord)
	});
	chrome.storage.local.set({
		imageModel: imageModel
	});
}

function updateImageModel() {
	ctx.drawImage(document.querySelector('video'), 0, 0, canv.width, canv.height);
	const img = new Image();
	img.src = canv.toDataURL('image/png');

	Tesseract.recognize(img, {
		lang: 'eng'
	}).then((result) => {
		uploadImageModel(result);
	});
}

window.setInterval(updateColors, 10000);
updateColors();
//window.setInterval(updateImageModel, 5000);
//updateImageModel();
window.setInterval(window.saveProgress, 30000);