declare module 'electron-updater' {

	interface UpdateInfo {
		version: string;
	}

	interface ProgressObj {
		bytesPerSecond: number;
		percent: number;
		transferred: number;
		total: number;
	}

	export const autoUpdater: {
		logger: any;
		
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

		quitAndInstall(): void;
		checkForUpdates(): void;
	}
}