let VERSION = process.env.TRAVIS_COMMIT_MESSAGE;
if (VERSION.startsWith('v')) {
	VERSION = VERSION.slice(1);
}
import GithubAPI = require('github')

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
	if (process.env.TRAVIS_OS_NAME === 'osx') {
		const latestRelease: Release = await gh.repos.getLatestRelease({
			owner: 'SanderRonde',
			repo: 'media-app'
		});

		if (latestRelease.tag_name !== `v${VERSION}`) {
			console.log('Latest release does not match this version, not publishing')
			return;
		}

		await gh.repos.editRelease({
			owner: 'SanderRonde',
			repo: 'media-app',
			id: latestRelease.id + '',
			tag_name: `v${VERSION}`,
			draft: false
		});

		console.log('Succesfully created release');
	} else {
		console.log('Not publishing since this is linux');	
	}
}

main().then(() => {
	process.exit(0);
});