#!/bin/sh

tsc && grunt move

cp /usr/bin/tar ./gtar
chmod +x gtar
export PATH=./:$PATH

electron-builder -ml -p "onTagOrDraft"