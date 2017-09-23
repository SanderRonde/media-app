const GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const VERSION = process.env.TRAVIS_COMMIT_MESSAGE;
const TAG = `v${VERSION}`;
const USER = 'SanderRonde';
const REPO = 'media-app';

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
	if (process.env.TRAVIS_OS_NAME === 'osx') {
		xhr(`/repos/${USER}/${REPO}/releases/`, 'PATCH', {
			access_token: GITHUB_ACCESS_TOKEN,
			tag_name: TAG,
			draft: true
		}).then(() => {
			console.log('Succesfully created release');
			process.exit(0);
		});
	} else {
		console.log('Not publishing since this is linux');	
	}
}

main();