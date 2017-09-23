const semver = require('semver');

const commitMessage = process.env.TRAVIS_COMMIT_MESSAGE || '';

//Exits with 0 when valid tag, 1 if not
process.exit(~~!semver.valid(commitMessage));