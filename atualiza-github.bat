@echo off
setlocal EnableExtensions

REM ===== CONFIG =====
set "REPO=C:\INNER\PAEX\Dashboard_Comercial\outputs\dashboard-vendas-margem"
REM ==================

cd /d "%REPO%"
if errorlevel 1 (
  echo [ERRO] Nao foi possivel acessar a pasta do repositorio:
  echo %REPO%
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Esta pasta nao e um repositorio Git.
  pause
  exit /b 1
)

for /f %%B in ('git branch --show-current') do set "BRANCH=%%B"
if "%BRANCH%"=="" set "BRANCH=main"

set "MSG=%*"
if "%MSG%"=="" (
  for /f %%D in ('powershell -NoProfile -Command "Get-Date -Format \"yyyy-MM-dd HH:mm:ss\" "') do set "NOW=%%D"
  set "MSG=chore: atualizacao automatica %NOW%"
)

echo.
echo [1/4] Adicionando arquivos...
git add -A

echo [2/4] Commit...
git commit -m "%MSG%" >nul 2>&1
if errorlevel 1 (
  echo [INFO] Nenhuma mudanca para commit.
)

echo [3/4] Sincronizando com remoto (rebase)...
git pull --rebase origin %BRANCH%
if errorlevel 1 (
  echo [ERRO] Falha no pull --rebase. Resolva conflitos e rode novamente.
  pause
  exit /b 1
)

echo [4/4] Enviando para GitHub...
git push origin %BRANCH%
if errorlevel 1 (
  echo [ERRO] Falha no push.
  pause
  exit /b 1
)

echo.
echo [OK] Repositorio atualizado com sucesso na branch %BRANCH%.
pause
exit /b 0