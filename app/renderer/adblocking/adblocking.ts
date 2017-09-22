import * as fs from 'fs';
import { session, dialog } from 'electron'
import { route } from '../routing/routing';
import * as filterParser from 'abp-filter-parser'

const FILTER_ALL = {
	urls: ['*://*./*', '*://*/*']
};

const PARTITION_MAP = {
	youtubeSubscriptions: 'www.youtube.com',
	youtubeplaylist: 'www.youtube.com',
	youtubeSearch: 'www.youtube.com',
	netflix: 'www.netflix.com',
	tracklists: 'www.1001tracklists.com'
}

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

	async function blockForPartition(partition: string, baseUrl: string) {
		await initialization;
		session.fromPartition(partition, {
			cache: true
		}).webRequest.onBeforeRequest(FILTER_ALL, async (details, callback) => {
			const shouldBeBlocked = await shouldBlock(details, baseUrl);
			callback({
				cancel: shouldBeBlocked
			});
		});
	}

	export function blockAds() {
		for (let key in PARTITION_MAP) {
			blockForPartition(key, PARTITION_MAP[key as keyof typeof PARTITION_MAP]);
		}
	}

	export async function addRule(rule: string) {
		await initialization;
		filterParser.parse(rule, rules);
	}

	function init(): Promise<void> {
		return new Promise<void>(async (resolve) => {
			fs.readFile(await route('./renderer/adblocking/easylist.txt'), 'utf8', (err, easylistTxt) => {
				if (err) {
					dialog.showMessageBox({
						message: 'Failed to find ad blocking list',
						type: 'info',
					});
				} else {
					filterParser.parse(easylistTxt, rules);
				}
				resolve();
			});
		});
	}
}