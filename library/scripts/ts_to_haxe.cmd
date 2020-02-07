@echo off
SETLOCAL

IF [%1]==[] GOTO :help
IF EXIST %1\NUL GOTO :dir

:file
IF [%2]==[] (SET DEST=%~dpn1.hx) ELSE (SET DEST=%2)
haxelib run refactor convertFile --exclude-string-literals "%1" "%DEST%" %~dp0..\rules\ts_to_haxe.rules
goto exit

:dir
IF [%2]==[] GOTO :help
haxelib run refactor convert --exclude-string-literals "%1" *.ts "%2" /[.]ts$/.hx/ %~dp0..\rules\ts_to_haxe.rules
goto exit

:help
echo Using: %~n0 ^<src^> ^<dest^>
echo.

:exit
ENDLOCAL
