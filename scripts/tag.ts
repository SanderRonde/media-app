const semver = require('semver');
import GithubAPI = require('@octokit/rest');

const commitMessage = process.env.TRAVIS_COMMIT_MESSAGE || '';
let VERSION = process.env.TRAVIS_COMMIT_MESSAGE;
if (VERSION.startsWith('v')) {
	VERSION = VERSION.slice(1);
}

interface Tag {
	name: string;
	commit: {
		sha: string;
		url: string;
	}
	zipball_url: string;
	tarball_url: string;
}

const validTag = !!semver.valid(commitMessage);

async function main() {
	if (!validTag) {
		console.log('Invalid tag')
		return;
	}
		
	//If not tagged yet, do so
	const gh = new GithubAPI({
		headers: {
			'User-Agent': 'SanderRonde'
		}
	});

	gh.authenticate({
		type: 'token',
		token: process.env.GH_ACCESS_TOKEN
	});

	const { data: tags }: {data: Tag[]} = await gh.gitdata.getTags({
		owner: 'SanderRonde',
		repo: 'media-app'
	});

	let tagExists: boolean = false;
	for (let i = 0; i < tags.length; i++) {
		if (tags[i].name.indexOf(commitMessage.slice(1)) > -1) {
			tagExists = true;
		}
	}

	if (tagExists) {
		console.log('Tag exists');
		return;
	}

	await gh.gitdata.createTag({
		owner: 'SanderRonde',
		repo: 'media-app',
		tag: `v${VERSION}`,
		message: VERSION,
		object: process.env.TRAVIS_COMMIT,
		type: 'commit',
		tagger: {
			name: 'Sander Ronde',
			email: 'awsdfgvhbjn@gmail.com',
			date: new Date().toISOString()
		}
	});

	await gh.gitdata.createReference({
		owner: 'SanderRonde',
		repo: 'media-app',
		sha: process.env.TRAVIS_COMMIT,
		ref: `refs/tags/v${VERSION}`
	});

	console.log('Created tag');
}

try {
	main().then(() => {
		//Exits with 0 when valid tag, 1 if not
		if (validTag) {
			console.log('Is a valid tag');
		}
		process.exit(~~validTag);
	});
} catch(e) {
	console.log('Something went wrong creating a tag (probably with the API)', e);
	process.exit(1);
}