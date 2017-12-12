import { session } from 'electron';
import filterParser = require('abp-filter-parser');
import { Settings } from './../settings/settings';
import { toast, warn, error } from '../log/log';
import { route } from '../routing/routing';
import https = require('https');
import path = require('path');
import URL = require('url');
import fs = require('fs');

export type Partitions = 'netflix'|'tracklists'|'youtubeplaylist'|
	'youtubeSearch'|'youtubeSubscriptions'|'youtubeSubsVideoView';

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
};

export namespace AdBlocking {
	export let done: boolean = false;
	let _block: boolean = true;
	let _settings: typeof Settings = null;
	let __resolveAppData: (appData: string) => void = null;
	let _appData: Promise<string> = new Promise<string>((resolve) => {
		__resolveAppData = (appData) => {
			resolve(appData);
		}
	});
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
			const shouldBeBlocked = _block ? await shouldBlock(details, hostname) : false;
			callback({
				cancel: shouldBeBlocked
			});
		});
	}

	export async function setStatus(block: boolean) {
		_block = block;
		await _settings.set('blockAds', block);
	}

	export async function blockAds(settings: typeof Settings, appData: string) {
		_settings = settings;
		__resolveAppData(appData);
		(appData);
		for (let key in PARTITION_MAP) {
			blockForPartition(key as Partitions, PARTITION_MAP[key as keyof typeof PARTITION_MAP]);
		}
		_block = await settings.get('blockAds');
	}

	export async function addRule(rule: string) {
		await initialization;
		filterParser.parse(rule, rules);
	}

	async function createDefaultDirectory() {
		const listsDir = path.join(await _appData, 'media-app', 'adLists/');
		const defaultListsDir = await route('./backgroundLibs/adblocking/defaultLists/');

		await new Promise((resolve) => {
			fs.mkdir(listsDir, (err) => {
				if (err) {
					//???
				}
				resolve();
			});
		});

		const files = await new Promise<string[]>((resolve) => {
			fs.readdir(defaultListsDir, (err, files) => {
				if (err) {
					throw err;
				} else {
					resolve(files);
				}
			});
		});

		await Promise.all(files.map((file) => {
			return new Promise((resolve) => {
				fs.createReadStream(path.join(defaultListsDir, file))
					.pipe(fs.createWriteStream(path.join(listsDir, file))).once('close', () => {
						resolve();
					});
			});
		}));

	}

	async function ensureFilesExist() {
		const listsDir = path.join(await _appData, 'media-app', 'adLists/');
		await new Promise((resolve) => {
			fs.stat(listsDir, async (err, stats) => {
				if (err) {
					//Dir doesn't exits, create it
					await createDefaultDirectory();
					resolve();
				} else {
					if (!stats.isDirectory()) {
						//Not a directory, delete first, then create
						await new Promise((resolveUnlink) => {
							fs.unlink(listsDir, (err) => {
								if (err) {
									throw err;
								} else {
									resolveUnlink();
								}
							});
						});
						await createDefaultDirectory();
					}
					resolve();
				}
			});
		});
	}

	function getListMetadata(content: string) {
		const fileLines = content.split('\n');
		let lastModified: string = null;
		let expiresIn: string = null;
		for (let i = 1; i < fileLines.length; i++) {
			if (fileLines[i].startsWith('!') && fileLines[i].indexOf('Last modified') > -1) {
				lastModified = fileLines[i];
			} else if (fileLines[i].startsWith('!') && fileLines[i].indexOf('Expires') > -1) {
				expiresIn = fileLines[i];
			}

			if (!fileLines[i].startsWith('!') || lastModified && expiresIn) {
				break;
			}
		}

		if (!lastModified || !expiresIn) {
			return null;
		}

	

		let lastModifiedDate = new Date(lastModified.split(':').slice(1).join(':'));
		return {
			lastModified: lastModifiedDate, 
			expiresIn: ~~(expiresIn.split(':')[1].trim().split('days')[0].trim())
		};
	}

	function downloadFile(filePath: string): Promise<string> {
		return new Promise((resolve) => {
			let str = '';
			const req = https.get(`https://easylist.to/easylist/${filePath}` as any, (res: any) => {
				res.on('data', (chunk: string) => {
					str += chunk;
				});
				res.on('end', () => {
					resolve(str);
				});
			});
			req.once('error', (e: Error) => {
				warn('Could not update adblocking list', e);
				resolve(null);
			});
		});
	}

	function updateFile(filePath: string) {
		return new Promise<boolean>(async (resolve) => {
			const content = await downloadFile(filePath);
			if (content === null) {
				resolve(false);
			}
			fs.writeFile(filePath, content, 'utf8', (err) => {
					if (err) {
						error('Failed to write to updated adlist file', err);
						resolve(false);
					} else {
						resolve(true);
					}
				});
		});
	}

	async function shouldFileUpdate(filePath: string) {
		const fileContents = await new Promise<string>((resolve) => {
			fs.readFile(filePath, 'utf8', (err, data) => {
				if (err) {
					throw err;
				} else {
					resolve(data);
				}
			});
		});

		const metaDataResult = getListMetadata(fileContents);
		if (metaDataResult === null) {
			return false;
		}
		const { lastModified, expiresIn } = metaDataResult;
		const expiresAt = new Date();
		expiresAt.setDate(lastModified.getDate() + expiresIn);

		if (new Date() > expiresAt) {
			return true;
		}
		return false;
	}

	async function getFiles(): Promise<string[]> {
		const listsDir = path.join(await _appData, 'media-app', 'adLists/');
		return new Promise<string[]>((resolve) => {
			fs.readdir(listsDir, (err, files) => {
				if (err) {
					throw err;
				} else {
					resolve(files);
				}
			});
		});
	}

	async function updateFiles() {
		const listsDir = path.join(await _appData, 'media-app', 'adLists/');
		const files = await getFiles();
		let updatedAll: boolean = true;
		await Promise.all(files.map((file) => {
			return new Promise(async (resolve) => {
				const shouldUpdate = await shouldFileUpdate(path.join(listsDir, file));
				if (shouldUpdate) {
					const didUpdate = await updateFile(path.join(listsDir, file));
					if (!didUpdate) {
						updatedAll = false;
					}
				}
				resolve();
			});
		}));
		if (!updatedAll) {
			toast('Some adblocking lists may not have been updated');
		}
	}

	async function readFiles(): Promise<string[]> {
		const files = await getFiles();
		return Promise.all(files.map((file) => {
			return new Promise<string>(async (resolve) => {
				const filePath = path.join(await _appData, 'media-app', 'adLists/', file);
				fs.readFile(filePath, 'utf8', (err, data) => {
					if (err) {
						throw err;
					} else {
						resolve(data);
					}
				});
			});
		}));
	}

	function init(): Promise<void> {
		return new Promise<void>(async (resolve) => {
			try {
				await ensureFilesExist();
				await updateFiles();
				const fileContentsArr = await readFiles();
				fileContentsArr.forEach((fileContents) => {
					filterParser.parse(fileContents, rules);
				});
			} catch(e) {
				warn(e);
				toast('Failed to find ad blocking list');
			}
		});
	}
}