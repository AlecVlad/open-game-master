@echo off
setlocal
set "CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if not exist "%CSC%" (
  echo .NET Framework C# compiler was not found.
  pause
  exit /b 1
)
"%CSC%" /nologo /target:exe /platform:anycpu /out:"%~dp0Start-OpenGameMaster.exe" "%~dp0Start-OpenGameMaster.cs"
if errorlevel 1 (
  echo Launcher compilation failed.
  pause
  exit /b 1
)
echo Built: %~dp0Start-OpenGameMaster.exe
