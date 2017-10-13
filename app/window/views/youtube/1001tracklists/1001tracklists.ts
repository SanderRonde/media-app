import { MessageableWindow } from '../../../libs/embedmsg';
import { CommWindow } from '../../../libs/comm';

declare const window: MessageableWindow<CommWindow>;

function toQueryString(obj: {
	[key: string]: string|number|boolean;
}) {
	const parts = [];
	for (let key in obj) {
		parts.push(`${key}=${obj[key]}`);
	}
	return `?${parts.join('&')}`;
}

window.onTask('searchFor', (data) => {
	(document.getElementById('main_search') as HTMLInputElement).value = data;
	(document.getElementById('search_selection') as HTMLInputElement).value = '9';
	document.getElementById('searchBtn').click();
});

window.onTask('findItem', (data) => {
	return new Promise((resolve) => {
		let isDone = false;
		let timeout = 0;
		Promise.all(Array.from(document.querySelectorAll('.tlBrowse tbody .action')).slice(0, 5).map((element) => {
			timeout += 750;
			return new Promise<string|false>((resolveResult, rejectResult) => {
				window.setTimeout(() => {
					const resultTab = `https://www.1001tracklists.com${element.querySelector('a').getAttribute('href')}`;

					if (isDone) {
						resolveResult(false);
						return;
					}
					window.fetch(resultTab).then((e) => {return e.text();}).then((html) => {
						const doc = document.createRange().createContextualFragment(html);
						const ytButton = Array.from(doc.querySelectorAll('#mediaItems .tab-bar > .tab-btn.action')).filter((tab) => {
							return (tab as HTMLElement).innerText.indexOf('YouTube') > -1;
						});
						if (!ytButton[0]) {
							resolveResult(false);
							return;
						}

						if (isDone) {
							resolveResult(false);
							return;
						}
						window.fetch(`https://www.1001tracklists.com/ajax/get_medialink.php${
							toQueryString({
								dontHide: true,
								showInline: true,
								jsMode: true,
								idMedia: doc.querySelector(`#${(ytButton[0])
									.getAttribute('onclick')
									.split(`')`)[0]
									.split(',')
									.pop().split(` '`)[1]}`).querySelector('div').getAttribute('data-idmedia')
							})
						}`).then((response) => {
							return response.text();
						}).then((text) => {
							let player;
							try {
								player = JSON.parse(text);
							} catch(e) {
								resolveResult(false);
								return;
							}

							if (data.indexOf(player.playerId) === -1) {
								resolveResult(false);
							} else {
								//Yep this is the one
								resolveResult(resultTab);
								isDone = true;
							}
						});
					});
				}, timeout);
			});
		})).then((found) => {
			resolve(found.reduce((current, next) => {
				return current || next;
			}) || null);
		}).catch(() => {
			resolve(null);
		});
	});
});