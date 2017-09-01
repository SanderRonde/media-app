import * as fs from 'fs';
import * as filterParser from 'abp-filter-parser'

export namespace AdBlocking {
	export let done: boolean = false;
	let initialization: Promise<void> = init();
	const rules: Partial<filterParser.FilterData> = {};

	function mapTypes(requestType: string): filterParser.elementTypes {
		switch (requestType) {
			case 'script':
				return filterParser.elementTypes.SCRIPT;
			case 'stylesheet':
				return filterParser.elementTypes.STYLESHEET;
			case 'xhr':
				return filterParser.elementTypes.XMLHTTPREQUEST;
			case 'image':
				return filterParser.elementTypes.IMAGE;
			case 'subFrame':
				return filterParser.elementTypes.SUBDOCUMENT;
			case 'mainFrame':
				return filterParser.elementTypes.DOCUMENT;
			case 'object':
				return filterParser.elementTypes.OBJECT;
			case 'other':
			default:
				return filterParser.elementTypes.OTHER;
		}
	}

	export async function shouldBlock(details: Electron.OnBeforeRequestDetails, pageURL: string): Promise<boolean> {
		await initialization;

		const domain = new URL(pageURL).hostname;
		const requestURL = details.url;
		const type = mapTypes(details.resourceType);

		return filterParser.matches(rules, requestURL, {
			domain: domain,
			elementTypeMaskMap: type
		});
	}

	export async function handleBlocking(view: Electron.WebviewTag) {
		await initialization;
		view.getWebContents().session.webRequest.onBeforeRequest({
			urls: ['*://*./*', '*://*/*']
		}, async (details, callback) => {
			const shouldBeBlocked = await shouldBlock(details, view.getURL());
			callback({
				cancel: shouldBeBlocked
			});
		});
	}

	export async function addRule(rule: string) {
		await initialization;
		filterParser.parse(rule, rules);
	}

	function init(): Promise<void> {
		return new Promise<void>((resolve) => {
			fs.readFile('./adblocking/easylist.txt', 'utf8', (err, easylistTxt) => {
				if (err) {
					alert('Failed to find ad blocking list');
				} else {
					filterParser.parse(easylistTxt, rules);
				}
				resolve()
			});
		});
	}
}