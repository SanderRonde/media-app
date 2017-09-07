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

function initRipple() {
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
}

interface Window {
	ws: WebSocket;
}

function mapIds(name: string): string {
	switch (name) {
		case 'Subs':
			return 'youtubeSubscriptions';
		case 'Music':
			return 'youtubeMusic';
		case 'YTs':
			return 'youtubeSearch';
		case 'Netflix':
			return 'netflix';
	}
	return '';
}

function initWs() {
	const ws = window.ws = new WebSocket(`ws://${location.hostname}:${location.port}`,
		'echo-protocol');
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
				const playCont = document.getElementById('pausePlay');
				if (data.data.playing) {
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

				document.getElementById(mapIds(data.data.app)).classList.add('selected');
				break;
		}
	}
}

function initListeners() {
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
}

function initOfflineIndicator() {
	window.addEventListener('online', () => {
		document.getElementById('networkStatus').classList.remove('visible');
	});
	window.addEventListener('offline', () => {
		document.getElementById('networkStatus').classList.add('visible');
	});
}

initWs();
initRipple();
initListeners();
initOfflineIndicator();