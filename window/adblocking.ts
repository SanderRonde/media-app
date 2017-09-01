import { initialize, isAd, client } from 'is-ad'

export namespace AdBlocking {
	export let done: boolean = false;
	let initialization = initialize().then(() => {
		done = true;
		return new Promise<void>((resolve) => {
			resolve();
		});
	});

	export async function shouldBlock(url: string): Promise<boolean> {
		await initialization;
		return isAd(url);
	}

	export async function handleBlocking(view: Electron.WebviewTag) {
		await initialization;
		view.getWebContents().session.webRequest.onBeforeRequest({
			urls: ['*://*./*']
		}, async (details, callback) => {
			const shouldBeBlocked = await shouldBlock(details.url);
			callback({
				cancel: shouldBeBlocked
			});
		});
	}

	export async function addRule(rule: string) {
		await initialization;
		client.parse(rule);
	}
}