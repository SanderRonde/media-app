export const REMOTE_PORT = 1234;

export const INDEX_PATH = '/page.jade';

export const PAPER_RIPPLE_DIR = '../../../node_modules/paper-ripple/dist/'

export const SW_TOOLBOX_DIR = '../../../node_modules/sw-toolbox/'

export const ICONS_DIR = '../../../icons/';

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