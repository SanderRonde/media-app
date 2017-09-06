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