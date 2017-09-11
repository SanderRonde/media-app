#!/bin/sh

grunt preBuild

electron-builder -ml -p "onTagOrDraft"