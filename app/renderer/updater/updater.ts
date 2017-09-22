import { autoUpdater, GithubOptions } from 'electron-updater';
import { Notification, app } from 'electron'
import os = require('os');

const DEBUG = process.argv.filter((arg) => {
	if (arg.indexOf('--debug-brk=') > -1) {
		return true;
	}
	return false;
}).length > 0;

export namespace Updater {
	let refs: {
		activeWindow: Electron.BrowserWindow;
		tray: Electron.Tray;
		DEBUG: boolean;
	} = null;

	function setFeed() {
		autoUpdater.setFeedURL({
			provider: 'github',
			repo: 'media-app',
			owner: 'SanderRonde'
		} as GithubOptions)
	}

	function showNotification(title: string, body: string = title, listener?: () => void) {
		const notification = new Notification({
			title: title,
			body: body
		});
		
		if (listener) {
			notification.addListener('click', listener);
		}
		notification.show();
	}

	function setProgress(progress: number) {
		if (refs.activeWindow) {
			refs.activeWindow.setProgressBar(progress / 100, {
				mode: 'normal'
			});
		}
	}

	function removeProgressBar() {
		if (refs.activeWindow) {
			refs.activeWindow.setProgressBar(-1, {
				mode: 'none'
			});
		}
	}

	function listenForUpdates() {
		autoUpdater.on('update-available', (updateInfo) => {
			showNotification('A new update is ready to download', 
				`Version ${updateInfo.version} is can be downloaded, click to start download`, () => {
					autoUpdater.downloadUpdate();
					setProgress(1);
					autoUpdater.signals.progress((info) => {
						setProgress(info.percent);
					});

					autoUpdater.signals.updateDownloaded((info) => {
						removeProgressBar();

						showNotification('Done downloading update', 
							'Click here to install and relaunch now', () => {
								app.relaunch();
								app.quit();
							});
					});
				});
		});
	}

	export function init(appRefs: {
		activeWindow: Electron.BrowserWindow;
		tray: Electron.Tray;
		DEBUG: boolean;
	}) {
		refs = appRefs;
		autoUpdater.autoDownload = false;		
		if (DEBUG) {
			return;
		}
		const platform = os.platform();
		if (platform === 'linux') {
			return;
		}

		setFeed();
		listenForUpdates();
	}
}