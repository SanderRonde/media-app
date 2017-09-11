declare module 'electron-updater' {

	interface UpdateInfo {
		version: string;
	}

	// ?
	type CancellationToken = string;

	interface ProgressObj {
		bytesPerSecond: number;
		percent: number;
		transferred: number;
		total: number;
	}

	interface VersionInfo {
		version: string;
	}

	interface FileInfo {
		name: string;
		url: string;
		packageInfo?: any;
		sha2?: string;
		sha512?: string;
		headers: {
			[key: string]: string;
		}
	}

	interface UpdateCheckResult {
		versionInfo: VersionInfo;
		fileInfo?: FileInfo;
		downloadPromise?: Promise<string[]>;
		cancellationToken?: CancellationToken;
	}

	interface UpdateInfo extends VersionInfo {
		path: string;
		packages?: {
			[key: string]: any;
		};
		githubArtifactName?: string;
		releaseName?: string;
		releaseNotes?: string;
		releaseDate: string;
		sha512?: string;
		stagingPercentage?: number;
	}

	export interface GenericServerOptions {
		provider: 'generic';
		url: string;
		channel?: string;
	}

	export interface BintrayOptions {
		provider: 'bintray';
		package?: string;
		repo?: string;
		owner?: string;
		component?: string;
		distribution?: string;
		user?: string;
		token?: string;
	}

	export interface GithubOptions {
		provider: 'github';
		repo?: string;
		owner?: string;
		vPrefixedTagName?: boolean;
		host?: string;
		protocol?: string;
		token?: string;
		private?: boolean;
	}

	export interface S3Options {
		provider: 's3';
		bucket: string;
		path?: string;
		region?: string;
		channel?: string;
		acl?: 'private'|'public-read'|null;
	}

	export const autoUpdater: {
		autoDownload: boolean;
		allowPrerelease: boolean;
		allowDowngrade: boolean;
		requestHeaders: {
			[key: string]: string;
		};
		logger: {
			info(...args: Array<any>): void;
			warn(...args: Array<any>): void;
			error(...args: Array<any>): void;
		}|null;
		configOnDisk: any;

		
		on(event: 'checking-for-update', callback: () => void): void;
		on(event: 'update-available', callback: (info: UpdateInfo) => void): void;
		on(event: 'update-not-available', callback: (info: UpdateInfo) => void): void;
		on(event: 'error', callback: (err: Error) => void): void;
		on(event: 'download-progress', callback: (progressObj: ProgressObj) => void): void;
		on(event: 'update-downloaded', callback: (info: UpdateInfo) => void): void;

		signals: {
			checkingForUpdate(listener: () => void): void;
			updateAvailable(listener: (info: UpdateInfo) => void): void;
			updateNotAvailable(listener: (info: UpdateInfo) => void): void;
			error(listener: (err: Error) => void): void;
			downloadProgress(listener: (progressObj: ProgressObj) => void): void;
			updateDownloaded(listener: (info: UpdateInfo) => void): void;
		}

		checkForUpdates(): Promise<UpdateCheckResult>;
		quitAndInstall(): void;
		checkForUpdates(): void;
		checkForUpdatesAndNotify(): void|Promise<void>;
		downloadUpdate(cancellationToken: CancellationToken): Promise<string>;
		getFeedURL(): void|null|string;
		setFeedURL(options: GenericServerOptions|S3Options|
			BintrayOptions|GithubOptions|string): void;
		quitAndInstall(isSilent: boolean, isForceRunAfter: boolean): void;
	}
}