#!/bin/sh

tsc && grunt move

electron-builder -ml -p "onTagOrDraft"