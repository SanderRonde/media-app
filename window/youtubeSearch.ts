import { Helpers, MappedKeyboardEvent, $ } from './helpers'
import { YoutubeVideoPlayer } from './youtubeMusic'
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
			return new Promise<Electron.WebviewTag>((resolve) => {
				if (videoView) {
					resolve(videoView);
				} else {
					videoPromise.then(resolve);
				}
			});
		}

		export async function getTitle(): Promise<string> {
			return await Helpers.hacksecute(await getView(), () => {
				return document.querySelector('.title').innerHTML;
			});
		}

		export async function setup() {
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

				videoView.addEventListener('did-finish-load', () => {
					Helpers.hacksecute(videoView, () => {
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

						(async () => {
							var ipcRenderer = require('electron').ipcRenderer;

							const player: YoutubeVideoPlayer = await getPlayer();
							const playerApi = document.getElementById('player-api');
							const volumeBar = document.createElement('div');
							const volumeBarBar = document.createElement('div');
							const volumeBarNumber = document.createElement('div');
							const video = document.getElementsByTagName('video')[0];
							let volumeBarTimeout: number = null;

							volumeBar.id = 'yt-ca-volumeBar';
							volumeBarBar.id = 'yt-ca-volumeBarBar';
							volumeBarNumber.id = 'yt-ca-volumeBarNumber';

							volumeBar.appendChild(volumeBarNumber);
							volumeBar.appendChild(volumeBarBar);
							document.body.appendChild(volumeBar);

							function doTempInterval(fn: () => void, interval: number, max: number) {
								const intervalId = window.setInterval(fn, interval);
								window.setTimeout(() => {
									window.clearInterval(intervalId);
								}, max);
							}

							function prepareVideo() {
								setTimeout(() => {							
									function reloadIfAd() {
										if (player.getAdState() === 1) {
											window.location.reload();
										}

										if (player.getPlayerState() === 3) {
											window.setTimeout(reloadIfAd, 250);
										} else {
											player.setPlaybackQuality('hd1080');
											if (player.getPlaybackQuality() !== 'hd1080') {
												player.setPlaybackQuality('hd720');
											}

											localStorage.setItem('loaded', 'ytmusic');
										}
									}
									reloadIfAd();
								}, 2500);

								doTempInterval(() => {
									player.setSizeStyle(false, true);
								}, 100, 5000);
							}

							prepareVideo();

							document.body.addEventListener('keydown', (e) => {
								if (e.key === 'k') {
									//Hide or show video
									document.body.classList.toggle('showHiddens');
								}
							});

							function updateSizes() {
								playerApi.style.width = window.innerWidth + 'px';
								playerApi.style.height = (window.innerHeight - 15) + 'px';

								player.setSize();
							}

							updateSizes();
							window.addEventListener('resize', updateSizes);

							function setPlayerVolume(volume: number) {
								player.setVolume(volume);

								localStorage.setItem('yt-player-volume', JSON.stringify({
									data: JSON.stringify({
										volume: volume,
										muted: (volume === 0)
									}),
									creation: Date.now(),
									expiration: Date.now() + (30 * 24 * 60 * 60 * 1000) //30 days
								}));
							}

							//Code that has to be executed "inline"
							function increaseVolume() {
								let vol = player.getVolume();
								if (player.isMuted()) {
									//Treat volume as 0
									vol = 0;
									player.unMute();
								}

								vol += 5;
								vol = (vol > 100 ? 100 : vol);
								setPlayerVolume(vol);
							}

							function lowerVolume() {
								let vol = player.getVolume();
								if (!player.isMuted()) {
									vol -= 5;
									
									vol = (vol < 0 ? 0 : vol);
									setPlayerVolume(vol);
								}
							}

							function showVolumeBar() {
								const volume = player.getVolume();
								localStorage.setItem('volume', volume + '');
								volumeBarNumber.innerHTML = volume + '';
								volumeBarBar.style.transform = `scaleX(${volume / 100})`;
								volumeBar.classList.add('visible');
								if (volumeBarTimeout !== null) {
									window.clearTimeout(volumeBarTimeout);
								}
								volumeBarTimeout = window.setTimeout(() => {
									volumeBar.classList.remove('visible');
									volumeBarTimeout = null;
								}, 2000);
							}

							function onScroll(isDown: boolean) {
								if (isDown) {
									lowerVolume();
								} else {
									increaseVolume();
								}
								showVolumeBar();
							}

							function addListeners() {
								window.onwheel = (e) => {
									onScroll(e.deltaY > 0);
								};
								video.onplay = () => {
									ipcRenderer.send('toBgPage', {
										type: 'passAlong',
										data: {
											type: 'onPlay',
											data: {
												view: 'youtubesearch'
											}
										}
									});
								}
								video.onpause = () => {
									ipcRenderer.send('toBgPage', {
										type: 'passAlong',
										data: {
											type: 'onPause',
											data: {
												view: 'youtubesearch'
											}
										}
									});
								}
							}

							addListeners();
						})();
					});
				});
			}, 10);
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
			const container = document.createElement('div');
			container.classList.add('suggestion');
			container.setAttribute('tabindex', '-1');

			const currentPart = document.createElement('span');
			const suggestionPart = document.createElement('span');
			suggestionPart.classList.add('suggestionPart');
			if (suggestion.indexOf(originalInput) === 0) {
				currentPart.innerText = originalInput;
				suggestionPart.innerText = suggestion.slice(originalInput.length);
			} else {
				currentPart.innerText = '';
				suggestionPart.innerText = suggestion;
			}
			
			container.appendChild(currentPart);
			container.appendChild(suggestionPart);

			container.addEventListener('click', () => {
				updateSelectedSuggestion(index);
				doSearch(suggestion);
			});
			container.addEventListener('keydown', (e) => {
				if (e.key === ' ') {
					updateSelectedSuggestion(index);
					doSearch(suggestion);
				}
			});

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

	export async function onFocus() {
		if (activePage === 'video') {
			(await Video.getView()).focus();
			AppWindow.updateStatus(await Video.getTitle());
		} else {
			if (SearchBar.lastSearch) {
				AppWindow.updateStatus(`Browsing search results for ${SearchBar.lastSearch}`);
			} else {
				AppWindow.updateStatus('Looking at search page');
			}
		}
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