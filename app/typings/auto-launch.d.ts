declare module 'auto-launch' {
	interface MacOptions {
		useLaunchAgent?: boolean;
	}

	interface AutoLaunchOptions {
		name: string;
		path?: string;
		isHidden?: boolean;
		mac?: MacOptions;
	}

	class AutoLaunch {
		constructor(options: AutoLaunchOptions);

		enable(): Promise<void>;
		disable(): Promise<void>;
		isEnabled(): Promise<boolean>;
	}

	export = AutoLaunch
}