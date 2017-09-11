cd scripts
node isTag.js

if errorlevel 0 (
    cd ..
    grunt preBuild

    electron-builder -w -p "always"
) else (
    cd ..
    grunt preBuild

    electron-builder -w
)