import filterParser = require('abp-filter-parser');
import { session, Notification } from 'electron';
import { route } from '../routing/routing';
import URL = require('url');
import fs = require('fs');

export type Partitions = 'netflix'|'tracklists'|'youtubeplaylist'|
	'youtubeSearch'|'youtubeSubscriptions'|'youtubeSubsVideoView'

const FILTER_ALL = {
	urls: ['*://*./*', '*://*/*']
};

const PARTITION_MAP: {
	[key in Partitions]: string;
} = {
	youtubeSubscriptions: 'https://www.youtube.com',
	youtubeSubsVideoView: 'https://www.youtube.com',
	youtubeplaylist: 'https://www.youtube.com',
	youtubeSearch: 'https://www.youtube.com',
	netflix: 'https://www.netflix.com',
	tracklists: 'https://www.1001tracklists.com'
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

	export async function shouldBlock(details: Electron.OnBeforeRequestDetails, domain: string): Promise<boolean> {
		await initialization;
		const requestURL = details.url;
		const type = mapTypes(details.resourceType);
		return filterParser.matches(rules, requestURL, {
			domain: domain,
			elementTypeMaskMap: type
		});
	}

	async function blockForPartition(partition: Partitions, baseUrl: string) {
		await initialization;
		const hostname = URL.parse(baseUrl).hostname;
		session.fromPartition(`persist:${partition}`, {
			cache: true
		}).webRequest.onBeforeRequest(FILTER_ALL, async (details, callback) => {
			const shouldBeBlocked = await shouldBlock(details, hostname);
			callback({
				cancel: shouldBeBlocked
			});
		});
	}

	export function blockAds() {
		for (let key in PARTITION_MAP) {
			blockForPartition(key as Partitions, PARTITION_MAP[key as keyof typeof PARTITION_MAP]);
		}
	}

	export async function addRule(rule: string) {
		await initialization;
		filterParser.parse(rule, rules);
	}

	function init(): Promise<void> {
		return new Promise<void>(async (resolve) => {
			fs.readFile(await route('./backgroundLibs/adblocking/easylist.txt'), 'utf8', (err, easylistTxt) => {
				if (err) {
					const notification = new Notification({
						title: 'No Adblocking',
						body: 'Failed to find ad blocking list'
					});
					notification.show();
				} else {
					filterParser.parse(easylistTxt, rules);
				}
				resolve();
			});
		});
	}
}