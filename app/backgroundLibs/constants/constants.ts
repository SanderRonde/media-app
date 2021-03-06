import { MessageTypes } from '../msg/msg';
import path = require('path');

export const REMOTE_PORT = 1234;

export const INDEX_PATH = '/page.jade';

export const SW_TOOLBOX_DIR = '../../../node_modules/sw-toolbox/';

export const ICONS_DIR = '../../../icons/mobile/';

const isRemote = !require('electron').dialog;
const app = isRemote ? require('electron').remote.app : 
	require('electron').app;
export const STORED_DATA_FILE = path.join(app.getPath('appData'), 'media-app', 'data.json');

export const EXTERNAL_EVENTS: (keyof MessageTypes.ExternalEventsNoArg)[] = [
	'focus',
	'lowerVolume',
	'raiseVolume',
	'pausePlay',
	'magicButton',
	'pause',
	'pausePlay',
	'youtubeSubscriptions',
	'youtubeMusic',
	'youtubeSearch',
	'netflix',
	'up', 'down', 'left', 'right',
	'toggleVideo'
];

export const ARG_EVENTS: (keyof MessageTypes.ExternalEventsWithArg)[] = [
	'cast',
	'hiddenCast'
];

export const LOG_REQUESTS = false;

export const LOG_ERROR_REQUESTS = true;