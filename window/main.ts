import { YoutubeSubscriptions } from './youtubeSubscriptions'
import { AppWindow, ViewNames } from './appWindow'
import { YoutubeSearch } from './youtubeSearch'
import { YoutubeMusic } from './youtubeMusic'
import * as firebase from 'firebase'
import { Helpers } from './helpers'
import { Netflix } from './netflix'

const firebaseConfig = (require('optional-require') as optionalRequire)(require)<{
	apiKey: string;
	authDomain: string;
	databaseURL: string;
	projectId: string;
	storageBucket: string;
	messagingSenderId: string;	
}>('../genericJs/secrets') || null;
if (firebaseConfig === null) {
	alert('Please export your firebase API config in genericJs/secrets.ts');
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
window.YoutubeSearch = YoutubeSearch;
window.YoutubeSubscriptions = YoutubeSubscriptions;