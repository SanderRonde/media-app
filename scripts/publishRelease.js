const GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const VERSION = process.env.TRAVIS_COMMIT_MESSAGE;
const TAG = `v${VERSION}`;
const USER = 'SanderRonde';
const REPO = 'media-app';
const https = require('https');

function getData(res, done) {
	let str = '';

	res.on('data', (chunk) => {
		str += chunk;
	});

	res.on('end', () => {
		done(str);
	});
}

function xhr(api, method = 'GET', params = {}) {
	const paramStrings = [];
	Object.getOwnPropertyNames(params).forEach((key, index) => {
		if (index === 0) {
			paramStrings.push(`?${key}=${params[key]}`);
		} else {
			paramStrings.push(`&${key}=${params[key]}`);
		}
	});
	return new Promise((resolve, reject) => {
		const req = https.request({
			method: method,
			host: 'api.github.com',
			path: `/${api}${paramStrings.map(encodeURIComponent).join('')}`
		}, (res) => {
			getData(res, (data) => {
				try {
					if (res.statusCode > 199 && res.statusCode < 300) {
						resolve(JSON.parse(data));
					} else {
						reject(JSON.parse(data));
					}
				} catch(e) {
					reject(new Error('Failed to parse server response'));
				}
			});
		});
		req.end();
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
		}).catch((e) => {
			console.log('Something went wrong', e);
			process.exit(1);
		});
	} else {
		console.log('Not publishing since this is linux');	
	}
}

main();