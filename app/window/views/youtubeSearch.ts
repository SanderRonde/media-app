import { AppWindow, MappedKeyboardEvent } from './appWindow';
import { SuggestionBar } from '../libs/suggestionBar';
import { YoutubeVideoPlayer } from './youtubeMusic';
import { getSecret } from '../libs/getSecrets';
import { Util, $ } from '../libs/util';

function arr(first: number, last: number): number[] {
	return Array.from(new Array(1 + last - first)).map((_, index) => {
		return first + index;
	});
}

const VALID_INPUT = arr(65, 90).map((charCode) => {
	return String.fromCharCode(charCode);
}).concat(arr(65,90).map((charCode) => {
	return String.fromCharCode(charCode).toLowerCase();
})).concat(arr(0, 9).map(num => num + '')).concat([
	'!','@','#','$','%','^','&','*','(',')','-','_','+','=','\'','"',
	';',':',',','.','<','>','/','?','\\','|','`','~'
]);

export namespace YoutubeSearch {
	let activePage: 'video'|'results' = 'results';

	export namespace Commands {
		export async function lowerVolume() {
			Util.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				let vol = player.getVolume();
				if (!player.isMuted()) {
					vol -= 5;
					
					vol = (vol < 0 ? 0 : vol);
					player.setVolume(vol);
				}
			});
		}

		export async function raiseVolume() {
			Util.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				let vol = player.getVolume();
				if (player.isMuted()) {
					//Treat volume as 0
					vol = 0;
					player.unMute();
				}

				vol += 5;
				vol = (vol > 100 ? 100 : vol);
				player.setVolume(vol);
			});
		}

		export async function togglePlay() {
			Util.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				const state = player.getPlayerState();
				if (state === 2) {
					//Paused
					player.playVideo();
				} else if (state === 1) {
					//Playing
					player.pauseVideo();
				} else {
					//???
				}
			});
		}

		export async function pause() {
			Util.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				player.pauseVideo();
			});
		}

		export async function play() {
			Util.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				player.playVideo();
			});
			if ((await Video.getView()).src.indexOf('exmaple.com') === -1) {
				showVideo();
			}
		}

		export function magicButton() { }

		export async function setup() {
			await SearchResultsPage.setup();
			await SearchBar.setup();
			await Video.setup();
			await Util.wait(15);
			SearchResultsPage.navTo('https://www.youtube.com/');
			AppWindow.updateStatus('Looking at search page');
		}
	
		export function onClose() { }
	
		export async function updateStatus() {
			if (activePage === 'video') {
				AppWindow.updateStatus(await Video.getTitle());
			} else {
				if (SearchBar.getLastSearch()) {
					AppWindow.updateStatus(`Browsing search results for ${SearchBar.getLastSearch()}`);
				} else {
					AppWindow.updateStatus('Looking at search page');
				}
			}
		}
	
		export async function onFocus() {
			if (activePage === 'video') {
				(await Video.getView()).focus();
			}
			updateStatus();
		}
	
		export async function getView(): Promise<Electron.WebviewTag> {
			if (activePage === 'video') {
				return Video.getView();
			} else {
				return SearchResultsPage.getView();
			}
		}
	
		export async function toggleVideoVisibility() {
			const subsCont = $('#youtubeSearchCont');
			if (activePage === 'video') {
				subsCont.classList.remove('showVideo');
				activePage = 'results';
				await Util.wait(500);
				(await SearchResultsPage.getView()).focus();
				SearchBar.show();
				if (SearchBar.getLastSearch()) {
					AppWindow.updateStatus(`Browsing search results for ${SearchBar.getLastSearch()}`);
				} else {
					AppWindow.updateStatus('Looking at search page');
				}
			} else {
				subsCont.classList.add('showVideo');
				activePage = 'video';
				await Util.wait(500);
				SearchBar.hide();
				(await Video.getView()).focus();
				AppWindow.updateStatus(await Video.getTitle());
			}
		}
	
		export async function onKeyPress(event: MappedKeyboardEvent): Promise<boolean> {
			if (AppWindow.getActiveViewName() !== 'youtubesearch') {
				return false;
			}
	
			if (event.key === 'h') {
				toggleVideoVisibility();
				return true;
			}
			if (event.key === 'ArrowLeft' && event.altKey && activePage === 'results') {
				const searchView = (await SearchResultsPage.getView());
				searchView.canGoBack() && searchView.goBack();
				return true;
			}
			if (event.key === 'ArrowRight' && event.altKey && activePage === 'results') {
				const searchView = (await SearchResultsPage.getView());
				searchView.canGoForward() && searchView.goForward();
				return true;
			}
			if (event.key === 's' && SearchBar.toggle()) {
				return true;
			}
			if (event.key === 'd' && activePage === 'video') {
				//Get current video URL and download it
				Util.downloadVideo((await Video.getView()).src);
				return true;
			}
			if (VALID_INPUT.indexOf(event.key) > -1 && 
				!event.altKey && !event.ctrlKey) {
					SearchBar.focus(event.key);
					return true;
				}
			if (event.key === 'Tab') {
				if (document.activeElement === SearchBar.getSearchBar()) {
					if (activePage === 'video') {
						(await Video.getView()).focus();
					} else {
						(await SearchResultsPage.getView()).focus();
					}
				} else {
					SearchBar.focus();
				}
			}
			return false;
		}

		export function free() {
			activePage = 'results';
			Video.free();
			SearchResultsPage.free();
			Queue.clear();
			$('#youtubeSearchCont').classList.remove('showVideo');
		}
	}

	export namespace Video {
		let videoView: Electron.WebviewTag = null;
		let videoPromise: Promise<Electron.WebviewTag> = null;

		export async function getView(): Promise<Electron.WebviewTag> {
			return new Promise<Electron.WebviewTag>(async (resolve) => {
				if (videoView) {
					resolve(videoView);
				} else if (videoPromise) {
					videoPromise.then(resolve);
				} else {
					resolve(await setup());
				}
			});
		}

		export async function getTitle(): Promise<string> {
			return await Util.hacksecute(await getView(), () => {
				return document.querySelector('.title').innerHTML;
			});
		}

		export async function setup(): Promise<Electron.WebviewTag> {
			if (videoPromise || videoView) {
				return await getView();
			}

			videoPromise = Util.createWebview({
				id: 'youtubeSearchVideoView',
				partition: 'youtubeSearch',
				parentId: 'youtubeSearchCont'
			});
			videoView = await videoPromise;

			window.setTimeout(() => {
				Util.addContentScripts(videoView, [{
					name: 'js',
					matches: ['*://www.youtube.com/*'],
					js: {
						files: [
							'./window/libs/keypress.js'
						]
					},
					run_at: 'document_end'
				}, {
					name: 'css',
					matches: ['*://www.youtube.com/*'],
					css: {
						files: [
							'./window/views/youtube/content/content.css'
						]
					},
					run_at: 'document_start'
				}]);

				videoView.addEventListener('did-finish-load', async () => {
					Util.hacksecute(videoView, (REPLACE) => {
						function getPlayer() {
							return new Promise<YoutubeVideoPlayer>((resolve) => {
								const timer = window.setInterval(() => {
									if (document.querySelector('.html5-video-player')) {
										resolve(document.querySelector('.html5-video-player') as YoutubeVideoPlayer);
										window.clearInterval(timer);
									}
								}, 500);
							});
						}

						getPlayer().then((player: YoutubeVideoPlayer) => {
							REPLACE.playPauseListeners('youtubesearch');
							REPLACE.volumeManager(player);
							REPLACE.initialSizing(player, 'youtubesearch');
							REPLACE.handleResize(player);
							REPLACE.handleToggleHiddens('k');
							REPLACE.detectOnEnd();
							REPLACE.adSkipper();
						});
					}, {
						volumeManager: Util.YoutubeVideoFunctions.volumeManager,
						playPauseListeners: Util.YoutubeVideoFunctions.playPauseListeners,
						initialSizing: Util.YoutubeVideoFunctions.initialSizing,
						handleResize: Util.YoutubeVideoFunctions.handleResize,
						handleToggleHiddens: Util.YoutubeVideoFunctions.handleToggleHiddens,
						detectOnEnd: Util.YoutubeVideoFunctions.detectOnEnd,
						adSkipper: Util.YoutubeVideoFunctions.adSkipper
					});
				});
			}, 10);

			return videoView;
		}

		export function navTo(url: string) {
			videoView.loadURL(url);
			showVideo();
		}

		export function free() {
			videoPromise = null;
			videoView && videoView.remove();
			videoView = null;
		}
	}

	export namespace SearchResultsPage {
		let searchResultsView: Electron.WebviewTag = null;
		let searchResultsPromise: Promise<Electron.WebviewTag> = null;

		export async function getView(): Promise<Electron.WebviewTag> {
			return new Promise<Electron.WebviewTag>((resolve) => {
				if (searchResultsView) {
					resolve(searchResultsView);
				} else {
					searchResultsPromise.then(resolve);
				}
			});
		}

		export async function setup() {
			searchResultsPromise = Util.createWebview({
				id: 'youtubeSearchResultsView',
				partition: 'youtubeSearch',
				parentId: 'youtubeSearchCont'
			});
			searchResultsView = await searchResultsPromise;
			searchResultsView.id = 'youtubeSearchResultsView';

			window.setTimeout(() => {
				Util.addContentScripts(searchResultsView, [{
					name: 'js',
					matches: ['*://www.youtube.com/*'],
					js: {
						files: [
							'./window/libs/comm.js',
							'./window/libs/keypress.js',
							'./window/views/youtubeSearch/results/results.js'
						]
					},
					run_at: 'document_end'
				}, {
					name: 'css',
					matches: ['*://www.youtube.com/*'],
					css: {
						files: [
							'./window/views/youtubeSearch/results/results.css'
						]
					},
					run_at: 'document_start'
				}]);
			}, 10);

			searchResultsView.addEventListener('dom-ready', () => {
				if (searchResultsView.getURL().indexOf('watch?') > -1) {
					searchResultsView.goBack();
				}
			});
		}

		export async function navTo(url: string) {
			(await searchResultsPromise).loadURL(url);
		}

		export function free() {
			searchResultsPromise = null;
			searchResultsView && searchResultsView.remove();
			searchResultsView = null;
		}
	}

	export namespace SearchBar {
		const suggestionBar = new SuggestionBar({
			searchBarId: 'searchInput',
			container: 'youtubeSearchCont',
			searchButton: '#searchButton',
			placeholder: 'Search'
		}, () => {
			return {
				async exec(query: string) {
					SearchResultsPage.navTo(
						`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
					Commands.toggleVideoVisibility();
				},
				async hide() {
					SearchBar.hide();

					//Now focus the video
					if (activePage === 'video') {
						(await Video.getView()).focus();
					}
				},
				async getSuggestions(query: string): Promise<{
					value: string;
					isSuggestion: boolean;
				}[][]> {
					const response = await fetch(`http://suggestqueries.google.com/complete/search?client=youtube&ds=yt&client=firefox&q=${encodeURIComponent(query)}`);
					const json: [string, string[]] = await response.json();
					return json[1].map((suggestion) => {
						const currentPartText = suggestion.indexOf(query) === 0 ?
							query : '';
						const suggestionPartText = suggestion.indexOf(query) === 0 ?
							suggestion.slice(query.length) : suggestion;
						return [{
							isSuggestion: false,
							value: currentPartText
						}, {
							isSuggestion: true,
							value: suggestionPartText
						}];
					});
				}
			};
		}, false);

		export async function setup() {
			suggestionBar.setup();
		}

		export function onPageClick() {
			suggestionBar.hideSuggestions();
		}

		export function toggle() {
			if (activePage === 'video') {
				$('#youtubeSearchCont').classList.toggle('searchHidden');
				return true;
			}
			return false;
		}

		export function show() {
			if (activePage === 'video') {
				$('#youtubeSearchCont').classList.remove('searchHidden');
				suggestionBar.searchBar.focus();
				return true;
			}
			return false;
		}

		export function hide() {
			if (activePage === 'video') {
				$('#youtubeSearchCont').classList.add('searchHidden');
				suggestionBar.searchBar.blur();
				return true;
			}
			return false;
		}

		export function focus(key: string = '') {
			show();			
			suggestionBar.focus();
		}

		export function getSearchBar() {
			return suggestionBar.searchBar;
		}

		export function getLastSearch() {
			return suggestionBar.lastSearch;
		}
	}

	export namespace Queue {
		const queue: string[] = [];

		function getVideoId(url: string) {
			const parsedURL = new URL(url);
			if (parsedURL.hostname === 'youtu.be') {
				return parsedURL.pathname.slice(1);
			} else {
				return parsedURL.searchParams.get('v');
			}
		}

		interface VideoInfo {
			kind: string;
			etag: string;
			pageInfo: {
				totalResults: number;
				resultsPerPage: number;
			};
			items: {
				id: string;
				kind: string;
				etag: string;
				snippet: {
					publishedAt: string;
					channelId: string;
					channelTitle: string;
					title: string;
					description: string;
					thumbnails: {
						default: {
							width: number;
							height: number;
							url: string;
						}
						medium: {
							width: number;
							height: number;
							url: string;
						}
						high: {
							width: number;
							height: number;
							url: string;
						};
						standard: {
							width: number;
							height: number;
							url: string;
						};
						maxres: {
							width: number;
							height: number;
							url: string;
						};
					}
					categoryId: string;
					tags: string[];
					liveBroadcastContent: string;
					localized: {
						title: string;
						description: string;
					}
				};
				contentDetails: {
					duration: string;
					aspectRatio: string;
					caption: string;
					definition: string;
					dimension: string;
					projection: string;
					licensedContent: boolean;
				};
				statistics: {
					viewCount: string;
					likeCount: string;
					dislikeCount: string;
					favoriteCount: string;
					commentCount: string;
				};
				status: {
					uploadStatus: string;
					privacyStatus: string;
				}
			}[];
		}


		let googleAPIKey: string = null;
		async function getGoogleAPIKey(): Promise<string> {
			if (googleAPIKey) {
				return googleAPIKey;
			}

			const key = await getSecret('googleAPIKey');
			googleAPIKey = key;
			return googleAPIKey;
		}

		async function getVideoInfo(url: string): Promise<VideoInfo> {
			const videoId = getVideoId(url);
			return await (fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${await getGoogleAPIKey()}&part=snippet,contentDetails,statistics,status`).then((res) => {
				return res.json();
			}));
		}

		function genImageElement(thumbnail: string): HTMLElement {
			if (thumbnail !== null) {
				return Util.el('img', 'youtubeAddedVideoImage', [], {
					props: {
						src: thumbnail
					}
				});
			} else {
				return Util.el('div', 'youtubeAddedVideoHiddenThumbnail', '?');
			}
		}	

		function createAddedVideoElement(title: string, thumbnail: string): HTMLElement {
			return Util.el('div', 'youtubeAddedVideoContainer', [
				Util.el('div', 'youtubeAddedVideoImageContainer', genImageElement(thumbnail)),
				Util.el('div', 'youtubeAddedVideoTitle', title)
			]);
		}

		async function displayAddedVideo(url: string, hidden: boolean) {
			let title = '???';
			let thumbnail: string = null;
			if (!hidden) {
				const videoInfo = await getVideoInfo(url);
				title = videoInfo.items[0].snippet.title;
				thumbnail = videoInfo.items[0].snippet.thumbnails.maxres.url;
			}

			const element = createAddedVideoElement(title, thumbnail);
			document.body.insertBefore(element, document.body.children[0]);
			await Util.wait(50);
			element.classList.add('visible');
			await Util.wait(5000);
			element.classList.remove('visible');
			await Util.wait(500);
			element.remove();
		}

		function play(url: string) {
			Video.navTo(url);
		}

		function isYoutubeUrl(url: string): boolean {
			const parsedURL = new URL(url);
			if (parsedURL.hostname === 'youtu.be') {
				return true;
			}
			if (parsedURL.hostname === 'www.youtube.com' && parsedURL.searchParams.has('v')) {
				return true;
			}
			return false;
		}

		export function push(url: string, hidden: boolean = false) {
			if (!isYoutubeUrl(url)) {
				return;
			}

			displayAddedVideo(url, hidden);
			queue.push(url);
		}

		export function skip() {
			play(queue.shift());
		}

		export function onVideoEnd() {
			skip();
		}

		export function clear() {
			while (queue.pop()) {}
		}
	}

	async function showVideo() {
		activePage = 'video';
		$('#youtubeSearchCont').classList.add('showVideo');
		SearchBar.hide();
		await Util.wait(500);
		(await Video.getView()).focus();
	}

	export async function changeVideo(url: string) {
		(await Video.getView()).loadURL(url);
		showVideo();
	}

	export async function onSearchBarFocus() {
		if (AppWindow.getActiveViewName() === 'youtubesearch') {
			if (activePage === 'results' || !$('#youtubeSearchCont').classList.contains('searchHidden')) {
				SearchBar.focus();
			}
		}
	}

	export async function onPaste(data: string) {
		const reg = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9]\.[^\s]{2,})/;
		if (reg.exec(data)) {
			let url;
			try {
				url = new URL(data);
			} catch (e) {
				return;
			}
			if ((url.hostname === 'youtu.be' && url.pathname.length > 1) || (url.hostname === 'www.youtube.com') && url.searchParams.has('v')) {
				if (AppWindow.getActiveViewName() === 'youtubesearch' && (await Video.getView())) {
					Video.navTo(data);
				} else {
					//Go to that view and focus the video
					await AppWindow.switchToview('youtubesearch');
					const interval = window.setInterval(async () => {
						if (AppWindow.loadedViews.indexOf('youtubesearch') > -1 && 
							(await Video.getView())) {
								//It's loaded
								window.clearInterval(interval);

								Video.navTo(data);
							}
					}, 50);
				}
			}
		}			
	}
}