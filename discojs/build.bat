SET DIR=%~dp0

@REM Build discojs-node
CD %DIR%\discojs-node
@RD /S /Q %DIR%\discojs-node\dist
npm run build-win

@REM Build discojs-web
CD %DIR%\discojs-web
@RD /S /Q %DIR%\discojs-web\dist
npm run build-win