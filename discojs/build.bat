@echo off
SET DIR=%~dp0

@REM Remove discojs-node/src/core symlink or file if exists
IF EXIST %DIR%discojs-node\src\core (
  IF EXIST %DIR%discojs-node\src\core\ (
    RMDIR /S /Q %DIR%discojs-node\src\core
  ) ELSE (
    DEL /F /Q %DIR%discojs-node\src\core
  )
)
@REM Create discojs-node/src/core symlink to discojs-core/src if not exists
IF NOT EXIST %DIR%\discojs-node\src\core (
  @MKLINK /D %DIR%\discojs-node\src\core %DIR%\discojs-core\src
)

@REM Remove discojs-web/src/core symlink or file if exists
IF EXIST %DIR%discojs-web\src\core (
  IF EXIST %DIR%discojs-web\src\core\ (
    RMDIR /S /Q %DIR%discojs-web\src\core
  ) ELSE (
    DEL /F /Q %DIR%discojs-web\src\core
  )
)
@REM Create discojs-web/src/core symlink to discojs-core/src if not exists
IF NOT EXIST %DIR%\discojs-web\src\core (
  @MKLINK /D %DIR%\discojs-web\src\core %DIR%\discojs-core\src
)

@REM Build discojs-node
CD %DIR%\discojs-node
@RD /S /Q %DIR%\discojs-node\dist
cmd.exe /c "npm run build-win"

@REM Build discojs-web
CD %DIR%\discojs-web
@RD /S /Q %DIR%\discojs-web\dist
cmd.exe /c "npm run build-win"