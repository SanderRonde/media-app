#!/bin/sh

tsc && grunt move

which tar
cp /bin/tar ./gtar
chmod +x gtar
export PATH=./:$PATH

electron-builder -ml -p "onTagOrDraft"