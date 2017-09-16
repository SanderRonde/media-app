import { autoUpdater, GithubOptions } from 'electron-updater';
import { Notification } from 'electron'
import os = require('os');

const DEBUG = process.argv.filter((arg) => {
	if (arg.indexOf('--debug-brk=') > -1) {
		return true;
	}
	return false;
}).length > 0;

export function handleUpdates() {
	if (DEBUG) {
		return;
	}

	const platform = os.platform();
	if (platform === 'linux') {
		return;
	}

	autoUpdater.setFeedURL({
		provider: 'github',
		repo: 'media-app',
		owner: 'SanderRonde'
	} as GithubOptions)

	autoUpdater.signals.updateDownloaded((newVersion) => {
		new Notification({
		title: "A new update is ready to install",
		body: `Version ${newVersion.version} is downloaded and will be automatically installed on Quit`
		}).show()
	})
	autoUpdater.checkForUpdates()
}