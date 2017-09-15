import { Helpers, MappedKeyboardEvent, $ } from './helpers'
import { YoutubeVideoPlayer } from './youtubeMusic'
import { getSecret } from '../genericJs/getSecrets'
import { AppWindow } from './appWindow'

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
			Helpers.hacksecute((await Video.getView()), () => {
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
			Helpers.hacksecute((await Video.getView()), () => {
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
			Helpers.hacksecute((await Video.getView()), () => {
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
			Helpers.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				player.pauseVideo();
			});
		}

		export async function play() {
			Helpers.hacksecute((await Video.getView()), () => {
				const player: YoutubeVideoPlayer = document.querySelector('.html5-video-player') as YoutubeVideoPlayer;
				player.playVideo();
			});
			if ((await Video.getView()).src.indexOf('exmaple.com') === -1) {
				showVideo();
			}
		}

		export function magicButton() { }
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
			return await Helpers.hacksecute(await getView(), () => {
				return document.querySelector('.title').innerHTML;
			});
		}

		export async function setup(): Promise<Electron.WebviewTag> {
			if (videoPromise || videoView) {
				return await getView()
			}

			videoPromise = Helpers.createWebview({
				id: 'youtubeSearchVideoView',
				partition: 'youtubeSearch',
				parentId: 'youtubeSearchCont'
			});
			videoView = await videoPromise;

			window.setTimeout(() => {
				Helpers.addContentScripts(videoView, [{
					name: 'js',
					matches: ['*://www.youtube.com/*'],
					js: {
						files: [
							'genericJs/keypress.js'
						]
					},
					run_at: 'document_end'
				}, {
					name: 'css',
					matches: ['*://www.youtube.com/*'],
					css: {
						files: [
							'youtube/content/content.css'
						]
					},
					run_at: 'document_start'
				}]);

				videoView.addEventListener('did-finish-load', async () => {
					await Helpers.wait(500);
					Helpers.hacksecute(videoView, (REPLACE) => {
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
							REPLACE.playPauseListeners();
							REPLACE.volumeManager(player);
							REPLACE.initialSizing(player, 'youtubesearch');
							REPLACE.handleResize(player);
							REPLACE.handleToggleHiddens('k');
							REPLACE.detectOnEnd();
						});
					}, {
						volumeManager: Helpers.YoutubeVideoFunctions.volumeManager,
						playPauseListeners: Helpers.YoutubeVideoFunctions.playPauseListeners,
						initialSizing: Helpers.YoutubeVideoFunctions.initialSizing,
						handleResize: Helpers.YoutubeVideoFunctions.handleResize,
						handleToggleHiddens: Helpers.YoutubeVideoFunctions.handleToggleHiddens,
						detectOnEnd: Helpers.YoutubeVideoFunctions.detectOnEnd
					});
				});
			}, 10);

			return videoView;
		}

		export function navTo(url: string) {
			videoView.loadURL(url);
			showVideo();
		}
	}

	namespace SearchResultsPage {
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
			searchResultsPromise = Helpers.createWebview({
				id: 'youtubeSearchResultsView',
				partition: 'youtubeSearch',
				parentId: 'youtubeSearchCont'
			});
			searchResultsView = await searchResultsPromise;
			searchResultsView.id = 'youtubeSearchResultsView';

			window.setTimeout(() => {
				Helpers.addContentScripts(searchResultsView, [{
					name: 'js',
					matches: ['*://www.youtube.com/*'],
					js: {
						files: [
							'genericJs/comm.js',
							'genericJs/keypress.js',
							'youtubeSearch/results/results.js'
						]
					},
					run_at: 'document_end'
				}, {
					name: 'css',
					matches: ['*://www.youtube.com/*'],
					css: {
						files: [
							'youtubeSearch/results/results.css'
						]
					},
					run_at: 'document_start'
				}]);
			}, 10);
		}

		export function navTo(url: string) {
			searchResultsView.loadURL(url);
		}
	}

	export namespace SearchBar {
		let searchBar: HTMLInputElement = document.getElementById('searchInput') as HTMLInputElement;
		let currentSuggestions: Array<string> = [];
		let selectedSuggestion: number = -1;
		let originalInput: string = '';
		export let lastSearch: string = '';

		function updateInputValue(): string {
			if (selectedSuggestion === -1) {
				if (searchBar.value !== originalInput) {
					searchBar.value = originalInput;
				}
				return originalInput;
			} else {
				searchBar.value = currentSuggestions[selectedSuggestion];
				return currentSuggestions[selectedSuggestion];
			}
		}

		function updateSelectedSuggestion(index: number): string {
			selectedSuggestion = index;
			Array.from($('#suggestions').children).forEach((child) => {
				child.classList.remove('selected');
			});
			if (index !== -1) {
				$('#suggestions').children.item(index).classList.add('selected');
			}
			return updateInputValue();
		}

		async function getSuggestions<T extends string>(query: T): Promise<string[]> {
			if (query === '') {
				return [];	
			}

			const response = await fetch(`http://suggestqueries.google.com/complete/search?client=youtube&ds=yt&client=firefox&q=${encodeURIComponent(query)}`);
			const json: [T, string[]] = await response.json();
			return json[1];
		}

		async function doSearch(query: string) {
			lastSearch = query;
			const searchResultsView = await SearchResultsPage.getView();
			searchResultsView.loadURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
			hideSuggestions();
		}

		function genSuggestionElement(suggestion: string, index: number): HTMLElement {
			const currentPartText = suggestion.indexOf(originalInput) === 0 ?
				originalInput : '';
			const suggestionPartText = suggestion.indexOf(originalInput) === 0 ?
				suggestion.slice(originalInput.length) : suggestion;

			const container = Helpers.el('div', 'suggestion', [
				Helpers.el('span', '', currentPartText),
				Helpers.el('span', 'suggestionPart', suggestionPartText)
			], {
				props: {
					tabindex: '-1'
				},
				listeners: {
					click: () => {
						updateSelectedSuggestion(index);
						doSearch(suggestion);		
					},
					keydown: (e: KeyboardEvent) => {
						if (e.key === ' ') {
							updateSelectedSuggestion(index);
							doSearch(suggestion);
						}
					}
				}
			})

			return container;
		}

		async function onKeyPress() {
			const value = searchBar.value;
			originalInput = value;

			const suggestions = await getSuggestions(value);
			const suggestionsContainer = document.getElementById('suggestions');
			Array.from(suggestionsContainer.children).forEach((child: HTMLElement) => {
				child.remove();
			});
			suggestions.map(genSuggestionElement).forEach((suggestionElement) => {
				suggestionsContainer.appendChild(suggestionElement);
			});

			currentSuggestions = suggestions;
			showSuggestions();

			updateSelectedSuggestion(-1);

			if (currentSuggestions.length === 0) {
				hideSuggestions();
			}
		}

		export function hideSuggestions() {
			$('#youtubeSearchCont').classList.add('suggestionsHidden');
		}

		export function showSuggestions() {
			$('#youtubeSearchCont').classList.remove('suggestionsHidden');
		}

		export async function setup() {
			searchBar.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') {
					hideSuggestions();
				} else if (e.key === ' ' && e.shiftKey) {
					showSuggestions();
					e.preventDefault();
					e.stopPropagation();
				} else if (e.key === 'ArrowDown') {
					if (selectedSuggestion === currentSuggestions.length - 1) {
						updateSelectedSuggestion(-1);
					} else {
						updateSelectedSuggestion(selectedSuggestion + 1);
					}
					updateInputValue();
					e.preventDefault();
					e.stopPropagation();
				} else if (e.key === 'ArrowUp') {
					if (selectedSuggestion > -1) {
						updateSelectedSuggestion(selectedSuggestion - 1);
					} else {
						updateSelectedSuggestion(currentSuggestions.length - 1);
					}
					updateInputValue();
					e.preventDefault();
					e.stopPropagation();
				} else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Enter') {
					//Don't update input
				} else {
					window.setTimeout(() => {
						onKeyPress();
					}, 1);
				}
			});

			$('#searchButton').addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				doSearch(updateInputValue());
			});

			hideSuggestions();
		}

		export function onPageClick() {
			hideSuggestions();
		}

		export function toggle() {
			if (activePage === 'video') {
				$('#youtubeSearchCont').classList.toggle('searchHidden');
				return true;
			}
			return false;
		}

		let wasShownPreTemp = true;
		
		export function tempShow(first: boolean = false) {
			if (first) {
				wasShownPreTemp = isShown();
			}

			show();
		}

		export function undoTempShow() {
			if (wasShownPreTemp) {
				show();
			} else {
				hide();
			}
		}

		export function isShown() {
			return !$('#youtubeSearchCont').classList.contains('searchHidden');
		}

		export function show() {
			if (activePage === 'video') {
				$('#youtubeSearchCont').classList.remove('searchHidden');
				searchBar.focus();
				return true;
			}
			return false;
		}

		export function hide() {
			if (activePage === 'video') {
				$('#youtubeSearchCont').classList.add('searchHidden');
				searchBar.blur();
				return true;
			}
			return false;
		}

		export function focus(key: string = '') {
			show();
			searchBar.value = searchBar.value + key;
			searchBar.focus();
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
			}
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
			}[]
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
				return Helpers.el('img', 'youtubeAddedVideoImage', [], {
					props: {
						src: thumbnail
					}
				});
			} else {
				return Helpers.el('div', 'youtubeAddedVideoHiddenThumbnail', '?');
			}
		}	

		function createAddedVideoElement(title: string, thumbnail: string): HTMLElement {
			return Helpers.el('div', 'youtubeAddedVideoContainer', [
				Helpers.el('div', 'youtubeAddedVideoImageContainer', genImageElement(thumbnail)),
				Helpers.el('div', 'youtubeAddedVideoTitle', title)
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
			await Helpers.wait(50);
			element.classList.add('visible');
			await Helpers.wait(5000);
			element.classList.remove('visible');
			await Helpers.wait(500);
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
	}

	async function showVideo() {
		activePage = 'video';
		$('#youtubeSearchCont').classList.add('showVideo');
		SearchBar.hide();
		await Helpers.wait(500);
		(await Video.getView()).focus();
	}

	export async function changeVideo(url: string) {
		console.log(url);
		(await Video.getView()).loadURL(url);
		showVideo();
	}

	export async function setup() {
		await Promise.all([
			SearchResultsPage.setup(),
			SearchBar.setup(),
			Video.setup()
		]);
		await Helpers.wait(15);
		SearchResultsPage.navTo('https://www.youtube.com/');
		AppWindow.updateStatus('Looking at search page');
	}

	export function onClose() { }

	export async function updateStatus() {
		if (activePage === 'video') {
			AppWindow.updateStatus(await Video.getTitle());
		} else {
			if (SearchBar.lastSearch) {
				AppWindow.updateStatus(`Browsing search results for ${SearchBar.lastSearch}`);
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
			await Helpers.wait(500);
			(await SearchResultsPage.getView()).focus();
			SearchBar.tempShow();
			if (SearchBar.lastSearch) {
				AppWindow.updateStatus(`Browsing search results for ${SearchBar.lastSearch}`)
			} else {
				AppWindow.updateStatus('Looking at search page');
			}
		} else {
			subsCont.classList.add('showVideo');
			activePage = 'video';
			await Helpers.wait(500);
			(await Video.getView()).focus();
			SearchBar.undoTempShow();
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
		if (event.key === 's' && SearchBar.toggle()) {
			return true;
		}
		if (event.key === 'd' && activePage === 'video') {
			//Get current video URL and download it
			Helpers.downloadVideo((await Video.getView()).src)
			return true;
		}
		if (VALID_INPUT.indexOf(event.key) > -1 && 
			!event.altKey && !event.ctrlKey) {
				SearchBar.focus(event.key);
				return true;
			}
		if (event.key === 'Tab') {
			SearchBar.focus();
		}
		return false;
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
			if ((url.hostname === 'youtu.be' || url.hostname === 'www.youtube.com') && url.searchParams.has('v')) {
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