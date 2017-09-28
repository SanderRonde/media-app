#!/bin/sh

git config user.name "Travis CI"
git config user.email "builds@travis-ci.org"
git config --global push.default simple

node ./isTag.js && \
  (git tag "v${TRAVIS_COMMIT_MESSAGE}" && \
  git push "https://${GITHUB_ACCESS_TOKEN}@github.com/SanderRonde/media-app.git" --tags --quiet > /dev/null) && \
  node createRelease.js