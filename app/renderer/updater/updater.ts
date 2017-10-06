import { autoUpdater, GithubOptions } from 'electron-updater';
import { Notification, app } from 'electron';
import { MediaApp } from '../../app';
import os = require('os');

const DEBUG = process.argv.filter((arg) => {
	if (arg.indexOf('--debug-brk=') > -1) {
		return true;
	}
	return false;
}).length > 0;

export namespace Updater {
	let refs: typeof MediaApp.Refs = null;
	let settings: typeof MediaApp.Settings = null;

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
			if (!settings.get('autoUpdate')) {
				return;
			}
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
								autoUpdater.quitAndInstall();
							});
					});
				});
		});
	}

	export async function checkForUpdates() {
		showNotification('Checking for updates...');
		if (!listening) {
			setFeed();
		}
		autoUpdater.checkForUpdates();
	}

	let listening: boolean = false;

	export function init(appRefs: typeof MediaApp.Refs, Settings: typeof MediaApp.Settings) {
		refs = appRefs;
		settings = Settings;
		autoUpdater.autoDownload = false;		
		if (DEBUG) {
			return;
		}
		const platform = os.platform();
		if (platform === 'linux') {
			return;
		}

		if (Settings.get('autoUpdate')) {
			setFeed();
			listening = true;
		}

		listenForUpdates();

		Settings.listen('autoUpdate', (newVal) => {
			if (newVal && !listening) {
				setFeed();
			}
		});
	}
}