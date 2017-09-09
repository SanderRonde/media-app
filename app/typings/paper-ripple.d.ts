declare class PaperRippleClass {
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

declare module 'paper-ripple' {
	export = PaperRippleClass;
}