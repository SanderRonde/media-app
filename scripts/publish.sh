#!/bin/sh

node ./scripts/isTag.js

if [ $? -eq 0 ] ; then
	grunt preBuild

	electron-builder -ml -p "always"
else
	grunt preBuild

	electron-builder -ml
fi