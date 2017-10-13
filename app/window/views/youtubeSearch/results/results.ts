import { MessageableWindow } from '../../../libs/embedmsg';
declare var window: MessageableWindow<ResultsWindow>;

interface ResultsWindow extends Window {
	signalledCompletion: boolean;
}

namespace YoutubeSearchResultsMain {
	namespace PlaceHolderPage {
		function generateCoverElement() {
			const coverElement = document.createElement('div');
			coverElement.style.backgroundColor = '#fafafa';
			coverElement.style.width = '100vw';
			coverElement.style.height = '100vh';
			coverElement.style.position = 'fixed';
			coverElement.style.zIndex = '2147483647';
			coverElement.style.top = '0';
			coverElement.style.left = '0';
			return coverElement;
		}

		function generateCenterer(direction: 'horizontal'|'vertical') {
			const el = document.createElement('div');
			el.style.height = '100%';
			el.style.display = 'flex';
			el.style.flexDirection = direction === 'horizontal' ? 'row' : 'column';
			el.style.justifyContent = 'center';

			return el;
		}

		function generateSearchSvg() {
			const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path.setAttribute('fill', '#000');
			path.setAttribute('d', 'M15.398,13.522l-3.878-3.877c0.631-0.977,1.004-2.136,1.004-3.384C12.524,' + 
				'2.809,9.713,0,6.262,0 C2.808,0,0,2.809,0,6.262c0,3.453,2.808,6.262,6.262,6.262c1.247,0,2.4' + 
				'06-0.371,3.384-1.003l3.876,3.878 c0.129,0.129,0.342,0.129,0.47,0l1.406-1.407C15.527,13.863' + 
				',15.527,13.653,15.398,13.522z M1.988,6.262 c0-2.355,1.916-4.273,4.273-4.273c2.356,0,4.272,' + 
				'1.917,4.272,4.273c0,2.355-1.916,4.272-4.272,4.272 C3.904,10.535,1.988,8.617,1.988,6.262z');
			
			const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			svg.setAttribute('viewBox', '0 0 16 16');
			svg.setAttribute('x', '0px');
			svg.setAttribute('y', '0px');
			svg.setAttribute('width', '30px');
			svg.setAttribute('height', '30px');
			svg.setAttribute('version', '1.1');
			svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
			svg.style.marginRight = '20px';
			append(svg, append(document.createElementNS('http://www.w3.org/2000/svg', 'g'), path));
			
			return svg;
		}

		function generateEmptyImage() {
			const el = document.createElement('div');
			el.style.userSelect = 'none';

			el.appendChild(generateSearchSvg());

			const textNode = document.createElement('span');
			textNode.style.fontWeight = 'bold';
			textNode.style.fontSize = '300%';
			textNode.style.userSelect = 'none';
			textNode.appendChild(document.createTextNode('Search Something'));
			el.appendChild(textNode);

			const underline = document.createElement('div');
			underline.style.backgroundColor = '#e62117';
			underline.style.height = '10px';

			el.appendChild(underline);
			
			return el;
		}

		function append(parent: HTMLElement|SVGElement, child: HTMLElement|SVGElement): HTMLElement|SVGElement {
			parent.appendChild(child);
			return parent;
		}

		export function init() {
			document.body.style.overflow = 'hidden';
			append(document.body, 
				append(generateCoverElement(), 
					append(generateCenterer('horizontal'),
						append(generateCenterer('vertical'), generateEmptyImage()))));
		}
	}

	namespace YoutubeSearchResultsPage {
		export function init() {
			const items = Array.from(document.querySelectorAll('ytd-video-renderer'));
			items.forEach((item) => {
				const thumbnail = item.querySelector('#thumbnail') as HTMLAnchorElement;
				const originalLink = thumbnail.href;
				thumbnail.addEventListener('click', (e) => {
					e.preventDefault();
					e.stopPropagation();

					window.sendMessage('toWindow', 'navToVideo', originalLink);
				});
				thumbnail.href = '#';

				const title = item.querySelector('#video-title') as HTMLAnchorElement;
				title.addEventListener('click', (e) => {
					e.preventDefault();
					e.stopPropagation();

					window.sendMessage('toWindow', 'navToVideo', originalLink);
				});
				title.href = '#';
			});
		}
	}

	export function init() {
		if (location.href.indexOf('results') === -1) {
			PlaceHolderPage.init();
		} else {
			YoutubeSearchResultsPage.init();
		}

		if (!window.signalledCompletion) {
			localStorage.setItem('loaded', 'youtubesearch');
			window.signalledCompletion = true;
		}

		document.body.addEventListener('click', () => {
			window.sendMessage('toWindow', 'youtubeSearchClick', null);
		});
	}
}

YoutubeSearchResultsMain.init();