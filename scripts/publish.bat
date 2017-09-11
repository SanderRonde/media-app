node ./scripts/isTag.js

if errorlevel 0 (
    grunt preBuild

    electron-builder -w -p "always"
) else (
    grunt preBuild

    electron-builder -w
)