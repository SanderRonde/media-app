import { YoutubeSubscriptions } from './youtubeSubscriptions'
import { AppWindow, ViewNames } from './appWindow'
import { YoutubeSearch } from './youtubeSearch'
import { YoutubeMusic } from './youtubeMusic'
import * as firebase from 'firebase'
import { Helpers } from './helpers'
import { Netflix } from './netflix'
import { dialog } from 'electron'

const firebaseConfig = (require('optional-require') as optionalRequire)(require)<{
	apiKey: string;
	authDomain: string;
	databaseURL: string;
	projectId: string;
	storageBucket: string;
	messagingSenderId: string;	
}>('./genericJs/secrets') || null;
if (firebaseConfig === null) {
	dialog.showMessageBox({
		message: 'Please export your firebase API config in genericJs/secrets.ts',
		buttons: [
			'Relaunch now',
			'Cancel',
		],
		defaultId: 0,
		cancelId: 1
	}, (response) => {
		if (response === 0) {
			ipcRenderer.send('toBgPage', {
				type: 'quit'
			});
		}
	});
}

firebase.initializeApp(firebaseConfig);

declare let window: CustomWindow;

interface CustomWindow extends Window {
	baseView: ViewNames;
	Helpers: typeof Helpers;
	Netflix: typeof Netflix;
	AppWindow: typeof AppWindow;
	YoutubeMusic: typeof YoutubeMusic;
	YoutubeSearch: typeof YoutubeSearch;
	YoutubeSubscriptions: typeof YoutubeSubscriptions;
}

AppWindow.init('youtubesearch');
window.Helpers = Helpers;
window.Netflix = Netflix;
window.AppWindow = AppWindow;
window.YoutubeMusic = YoutubeMusic;
window.YoutubeSubscriptions = YoutubeSubscriptions;