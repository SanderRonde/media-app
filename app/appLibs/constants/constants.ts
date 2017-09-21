import path = require('path');

export const REMOTE_PORT = 1234;

export const INDEX_PATH = '/page.jade';

export const SW_TOOLBOX_DIR = '../../../node_modules/sw-toolbox/'

export const ICONS_DIR = '../../../icons/';

const isRemote = !require('electron').dialog;
export const STORED_DATA_FILE = path.join((isRemote ? 
	require('electron').remote.app : require('electron').app).getPath('appData'), 'data.json');

export type EXTERNAL_EVENT = 'focus'|'lowerVolume'|'raiseVolume'|'pausePlay'|
	'magicButton'|'pause'|'youtubeSubscriptions'|'youtubeMusic'|
	'youtubeSearch'|'netflix'|'up'|'down'|'left'|'right'|'toggleVideo';

export const EXTERNAL_EVENTS: EXTERNAL_EVENT[] = [
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
]

export type EXTERNAL_EVENTS = EXTERNAL_EVENT[];

export type ARG_EVENT = 'cast'|'hiddenCast';

export const ARG_EVENTS: ARG_EVENT[] = [
	'cast',
	'hiddenCast'
]

export const LOG_REQUESTS = false;

export const LOG_ERROR_REQUESTS = true;