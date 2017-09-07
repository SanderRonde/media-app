/// <reference path="../../../typings/sw-toolbox.d.ts" />

declare function importScripts(name: string): void;

importScripts('/sw-toolbox.js');

toolbox.options.cache.name = 'MediaAppRemoteCache';
toolbox.options.cache.maxEntries = 500;
toolbox.options.cache.maxAgeSeconds = 60 * 60 * 24 * (365.25 / 12);

const toCache = ['/', '/paper-ripple.css', '/page.css', 
	'/manifest.json', '/favicon.ico', '/PaperRipple.js',
	'/page.js', '/sw-toolbox.js', '/base.html', '/offline.html'];

toolbox.precache(toCache);

function getFromCache(path: string): RequestPromise {
	return (req, values, options): Promise<Response> => {
		return new Promise<Response>((resolve) => {
			caches.open(toolbox.options.cache.name).then((cache) => {
				cache.match(path).then((res) => {
					resolve(res);
				});
			});
		})
	}
}

function promisify<T>(val: T): Promise<T> {
	return new Promise<T>((resolve) => {
		resolve(val);
	});
}

self.addEventListener('install', async (event) => {
	toolbox.router.any('/', (req) => {
		return getFromCache(navigator.onLine ? '/' : '/offline.html')(req, {});
	});
	toolbox.router.any('/paper-ripple.css', toolbox.fastest);
	toolbox.router.any('/PaperRipple.js', toolbox.fastest);
	toolbox.router.any('/sw-toolbox.js', toolbox.fastest);
	toolbox.router.any('/offline.html', toolbox.fastest);
	toolbox.router.any('/manifest.css', toolbox.fastest);
	toolbox.router.any('/favicon.ico', toolbox.fastest);
	toolbox.router.any('/base.html', toolbox.fastest);
	toolbox.router.any('/page.css', toolbox.fastest);
	toolbox.router.any('/page.js', toolbox.fastest);

	toolbox.router.default = (req, values, options) => {
		if (new URL(req.url).origin === self.location.origin) {
			return promisify(new Response('404 - Not Found', {
				status: 404,
				statusText: 'Not Found'
			}));
		} else {
			return fetch(req);
		}
	}
});