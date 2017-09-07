import { YoutubeSubscriptions } from './youtubeSubscriptions'
import { AppWindow, ViewNames } from './appWindow'
import { YoutubeSearch } from './youtubeSearch'
import { YoutubeMusic } from './youtubeMusic'
import { Helpers } from './helpers'
import { Netflix } from './netflix'

declare let window: CustomWindow;

const DEBUG = location.hash === '#DEBUG';

interface CustomWindow extends Window {
	baseView: ViewNames;
	Helpers: typeof Helpers;
	Netflix: typeof Netflix;
	AppWindow: typeof AppWindow;
	YoutubeMusic: typeof YoutubeMusic;
	YoutubeSearch: typeof YoutubeSearch;
	YoutubeSubscriptions: typeof YoutubeSubscriptions;
}

AppWindow.init('youtubesearch', DEBUG);
window.Helpers = Helpers;
window.Netflix = Netflix;
window.AppWindow = AppWindow;
window.YoutubeMusic = YoutubeMusic;
window.YoutubeSearch = YoutubeSearch;
window.YoutubeSubscriptions = YoutubeSubscriptions;