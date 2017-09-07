declare class PaperRipple {
	constructor(config?: {
		initialOpacity?: number;
		opacityDecayVelocity?: number;
		recenters?: boolean;
		center?: boolean;
		round?: boolean;
		target?: HTMLElement;
	})
	$: HTMLElement;
	downAction(event: MouseEvent): void;
	upAction(): void;
}

Array.from(document.querySelectorAll('.rippleTarget')).forEach((rippleTarget: HTMLElement) => {
	const ripple = new PaperRipple();
	rippleTarget.appendChild(ripple.$);

	rippleTarget.addEventListener('mousedown', (e) => {
		ripple.downAction(e);
	});
	rippleTarget.addEventListener('mouseup', () => {
		ripple.upAction();
	});
});

const ws = new WebSocket(`ws://${location.hostname}:${location.port}`);
ws.onmessage = (event) => {
	const data = JSON.parse(event.data) as {
		type: 'statusUpdate';
		data: {
			app: string;
			status: string;
		};
	}|{
		type: 'playUpdate';
		data: {
			playing: boolean;
		}
	};

	switch (data.type) {
		case 'playUpdate':
			const playCont = document.getElementById('playPause');
			if (!data.data.playing) {
				playCont.classList.add('pause');
			} else {
				playCont.classList.remove('pause');
			}
			break;
		case 'statusUpdate':
			const statusTypeContainer = document.getElementById('statusType');
			const statusContainer = document.getElementById('status');

			statusTypeContainer.innerText = data.data.app;
			statusContainer.innerText = data.data.status;

			Array.from(document.querySelectorAll('#switchTypeRow > *')).forEach((switchType) => {
				switchType.classList.remove('selected');
			});

			document.getElementById(data.data.app).classList.add('selected');
			break;
	}
}

([
	'focus',
	'lowerVolume',
	'raiseVolume',
	'pausePlay',
	'magicButton',
	'pause',
	'pausePlay',
	'youtubeSubscriptions',
	'youtubeMusic',
	'youtubeSearch',
	'netflix',
	'up', 'down', 'left', 'right',
	'toggleVideo'
]).forEach((externalEvent) => {
	document.getElementById(externalEvent).addEventListener('tap', () => {
		fetch(`/api/${externalEvent}`);
	});
});