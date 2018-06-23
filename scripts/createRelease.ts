let VERSION = process.env.TRAVIS_COMMIT_MESSAGE;
if (VERSION.startsWith('v')) {
	VERSION = VERSION.slice(1);
}
const fs = require('fs');
const path = require('path');

import GithubAPI = require('@octokit/rest')

interface User {
	login: string;
	id: number;
	avatar_url: string;
	gravatar_id: string;
	url: string;
	html_url: string;
	followers_url: string;
	following_url: string;
	gists_url: string;
	starred_url: string;
	subscriptions_url: string;
	organizations_url: string;
	repos_url: string;
	events_url: string;
	received_events_url: string;
	type: string;
	site_admin: boolean;
}

interface Asset {
	url: string;
	browser_download_url: string;
	id: number;
	name: string;
	label: string;
	state: string;
	content_type: string;
	size: number;
	download_count: number;
	created_at: string;
	updated_at: string;
	uploader: User;
}

type GithubMeta<T> = {
	meta: {
		'x-ratelimit-limit': string;
		'x-ratelimit-remaining': string,
		'x-ratelimit-reset': string,
		'x-oauth-scopes': string,
		'x-github-request-id': string,
		'x-github-media-type': string,
		'last-modified': string,
		etag: string,
		status: string
	};
	data: T;
}

interface Release {
	url: string;
	html_url: string;
	assets_url: string;
	upload_url: string;
	tarball_url: string;
	zipball_url: string;
	id: number;
	tag_name: string;
	target_commitish: string;
	name: string;
	body: string;
	draft: boolean;
	prerelease: boolean;
	created_at: string;
	published_at: string;
	author: User;
	assets: Asset[];
}

const gh = new GithubAPI({
	headers: {
		'User-Agent': 'SanderRonde'
	},
	Promise: Promise
});

gh.authenticate({
	type: 'token',
	token: process.env.GH_ACCESS_TOKEN
});

async function main() {
	//Check if it already exists
	const allReleases: GithubMeta<Release[]> = await gh.repos.getReleases({
		owner: 'SanderRonde',
		page: 0,
		per_page: 20,
		repo: 'media-app'
	});

	for (let release of allReleases.data) {
		if (release.tag_name === `v${VERSION}`) {
			//Already exists
			console.log('Already exists');
			return;
		}	
	}

	const [ major, minor, patch ] = VERSION.split('.');
	if (typeof major !== 'number' || typeof minor !== 'number' || typeof patch !== 'number') {
		console.log('Not a release');
		return;
	}

	const fullChangelog: {
		[key: string]: string[]
	} = JSON.parse(fs.readFileSync(path.join(__dirname, './changelog.json'), 'utf8'));
	if (!(VERSION in fullChangelog)) {
		throw new Error('No release notes for this version exist');
	} else {
		const releaseNotes = fullChangelog[VERSION].map((releaseNote) => {
			return `* ${releaseNote}`
		}).join('\n');

		await gh.repos.createRelease({
			owner: 'SanderRonde',
			repo: 'media-app',
			tag_name: `v${VERSION}`,
			body: releaseNotes,
			draft: true,
			name: VERSION,
			prerelease: false,
			target_commitish: process.env.TRAVIS_COMMIT
		});

		console.log('Created release');
	}
}

main().then(() => {
	process.exit(0);
}, (err) => {
	console.log('Something went wrong creating a tag (probably with the API)', err);
	process.exit(1);
});