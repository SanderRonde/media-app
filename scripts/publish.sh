#!/bin/sh

tsc && grunt move

echo "Copying gtar"
cp /usr/bin/tar /usr/bin/gtar
chmod +x /usr/bin/gtar

electron-builder -ml -p "onTagOrDraft"