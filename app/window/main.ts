import { YoutubeSubscriptions } from './views/youtubeSubscriptions';
import { AppWindow, ViewNames } from './views/appWindow';
import { YoutubeSearch } from './views/youtubeSearch';
import { YoutubeMusic } from './views/youtubeMusic';
import { CommandBar } from './libs/commandbar';
import { Util } from './libs/util';
import { Netflix } from './views/netflix';

declare let window: CustomWindow;

const DEBUG = location.hash === '#DEBUG';

interface CustomWindow extends Window {
	baseView: ViewNames;
	Util: typeof Util;
	Netflix: typeof Netflix;
	AppWindow: typeof AppWindow;
	CommandBar: typeof CommandBar;
	YoutubeMusic: typeof YoutubeMusic;
	YoutubeSearch: typeof YoutubeSearch;
	YoutubeSubscriptions: typeof YoutubeSubscriptions;
}

AppWindow.init('ytmusic', DEBUG);
window.Util = Util;
window.Netflix = Netflix;
window.AppWindow = AppWindow;
window.CommandBar = CommandBar;
window.YoutubeMusic = YoutubeMusic;
window.YoutubeSearch = YoutubeSearch;
window.YoutubeSubscriptions = YoutubeSubscriptions;