const GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const VERSION = process.env.TRAVIS_COMMIT_MESSAGE;
const TAG = `v${VERSION}`;
const USER = 'SanderRonde';
const REPO = 'media-app';

const fs = require('fs');
const path = require('path');

function xhr(api, method = 'GET', params = {}) {
	const paramStrings = [];
	Object.getOwnPropertyNames(params).forEach((key, index) => {
		if (index === 0) {
			paramStrings.push(`?${key}=${params[key]}`);
		} else {
			paramStrings.push(`&${key}=${params[key]}`);
		}
	});
	const xhrObj = new XMLHttpRequest();
	xhrObj.open(method, `https://api.github.com/${api}${paramStrings.join('')}`);
	xhrObj.overrideMimeType('application/json');
	return new Promise((resolve, reject) => {
		xhrObj.onreadystatechange = () => {
			if (xhrObj.readyState === xhrObj.DONE) {
				try {
					if (xhrObj.status > 199 && xhrObj.status < 300) {
						resolve(JSON.parse(xhrObj.responseText));
					} else {
						reject(JSON.parse(xhrObj.responseText));
					}
				} catch(e) {
					reject(new Error('Failed to parse server response'));
				}
			}
		}
	});
}

function main() {
	xhr(`repos/${USER}/${REPO}/releases/latest`).then((latestRelease) => {
		if (latestRelease.name === VERSION) {
			process.exit(0);
		} else {
			const fullChangelog = JSON.parse(fs.readFileSync(path.join(__dirname, './releases.json'), 'utf8'));
			if (!(VERSION in fullChangelog)) {
				throw new Error('No release notes for this version exist');
			} else {
				const releaseNotes = fullChangelog[VERSION];
				xhr(`/repos/${USER}/${REPO}/releases/`, 'POST', {
					access_token: GITHUB_ACCESS_TOKEN,
					tag_name: TAG,
					name: TAG,
					body: releaseNotes.map((releaseNote) => {
						return `* ${releaseNote}`
					}).join('\n'),
					draft: true
				}).then(() => {
					console.log('Succesfully created release');
					process.exit(0);
				});
			}
		}
	});
}

main();