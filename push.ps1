param(
    [string]$RemoteUrl = 'https://github.com/bytepi-genius/saif-sys.git',
    [string]$Branch    = 'main',
    [string]$Message   = "chore: update $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

function Log  { param($m) Write-Host "  >  $m" -ForegroundColor Gray }
function Ok   { param($m) Write-Host "  OK $m" -ForegroundColor Green }
function Warn { param($m) Write-Host "  !! $m" -ForegroundColor Yellow }
function Err  { param($m) Write-Host "  xx $m" -ForegroundColor Red }

Clear-Host
Write-Host ''
Write-Host '============================================================' -ForegroundColor DarkCyan
Write-Host '                 saif-sys - GitHub Push                     ' -ForegroundColor DarkCyan
Write-Host '============================================================' -ForegroundColor DarkCyan
Write-Host "  Repository : $RemoteUrl"
Write-Host "  Branch     : $Branch"
Write-Host "  Directory  : $PWD"
Write-Host ''

# 1 - git check
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Err 'git is not installed or not on PATH.'
    Log 'Install from https://git-scm.com/downloads and reopen this window.'
    Read-Host 'Press Enter to close'
    exit 1
}
Ok (git --version)

# 2 - .gitignore
if (-not (Test-Path .gitignore)) {
    Warn '.gitignore missing - creating a standard one'
    @'
# OS
.DS_Store
Thumbs.db

# Editors
.vscode/
.idea/
*.swp

# Node
node_modules/
dist/
build/
.vite/
npm-debug.log*
yarn-error.log*
pnpm-debug.log*

# Python
__pycache__/
*.py[cod]
*.egg-info/
.venv/
venv/
env/
.pytest_cache/
.mypy_cache/

# Env
.env
.env.*

# Logs
*.log
'@ | Set-Content .gitignore -Encoding ASCII
    Ok '.gitignore created'
} else {
    Ok '.gitignore present'
}

# 3 - init repo
if (-not (Test-Path .git)) {
    Log 'Initializing git repository'
    git init | Out-Null
    Ok 'git init done'
} else {
    Ok 'Existing repository detected'
}

# ensure branch
$current = (git rev-parse --abbrev-ref HEAD 2>$null)
if ($current -ne $Branch) {
    Log "Switching to branch '$Branch'"
    git checkout -B $Branch 2>$null | Out-Null
}
Ok "On branch $Branch"

# 4 - identity
$userName  = (git config user.name)  2>$null
$userEmail = (git config user.email) 2>$null
if (-not $userName -or -not $userEmail) {
    Warn 'git user.name or user.email is not set (global)'
    Log  'Set them with:'
    Log  '  git config --global user.name  "Your Name"'
    Log  '  git config --global user.email "you@example.com"'
} else {
    Ok "$userName <$userEmail>"
}

# 5 - stage
Log 'Staging files'
git add -A
Ok 'All changes staged'

# 6 - safety scan
$staged = git diff --cached --name-only
if (-not $staged) {
    Warn 'Nothing to commit - working tree is clean'
} else {
    $forbidden = $staged | Where-Object {
        $_ -match '(^|/)node_modules/' -or
        $_ -match '(^|/)venv/'          -or
        $_ -match '(^|/)\.venv/'        -or
        $_ -match '(^|/)__pycache__/'   -or
        $_ -match '(^|/)dist/'          -or
        $_ -match '(^|/)\.vite/'
    }
    if ($forbidden) {
        Err 'Forbidden paths are staged:'
        $forbidden | ForEach-Object { Write-Host "     - $_" -ForegroundColor Red }
        Log 'Aborting. Fix .gitignore and re-run.'
        Read-Host 'Press Enter to close'
        exit 1
    }
    Ok "No forbidden paths found ($($staged.Count) files staged)"
    Write-Host ''
    Write-Host '  Files staged for this commit:' -ForegroundColor DarkGray
    $staged | Select-Object -First 30 | ForEach-Object {
        Write-Host "     $_" -ForegroundColor DarkGray
    }
    if ($staged.Count -gt 30) {
        Write-Host "     ... and $($staged.Count - 30) more" -ForegroundColor DarkGray
    }
}

# 7 - commit
if ($staged) {
    Log 'Creating commit'
    git commit -m $Message | Out-Null
    Ok "Committed: $Message"
}

# 8 - remote
$remotes = (git remote) 2>$null
if ($remotes -contains 'origin') {
    $currentUrl = (git remote get-url origin)
    if ($currentUrl -ne $RemoteUrl) {
        Log "Updating origin URL"
        Log "  old: $currentUrl"
        Log "  new: $RemoteUrl"
        git remote set-url origin $RemoteUrl | Out-Null
    } else {
        Ok "origin already set to $RemoteUrl"
    }
} else {
    git remote add origin $RemoteUrl | Out-Null
    Ok "origin added: $RemoteUrl"
}

# 9 - reachability
Log 'Checking remote access'
try {
    $null = git ls-remote --heads origin 2>&1
    Ok 'Remote is reachable'
} catch {
    Warn 'Could not reach remote. Common causes:'
    Log  '  - The repo does not exist on GitHub. Create it at https://github.com/new'
    Log  '  - You are not authenticated (need a Personal Access Token or gh auth login)'
    $continue = Read-Host '  Continue anyway? (y/N)'
    if ($continue -notmatch '^[Yy]') {
        Log 'Aborted by user.'
        Read-Host 'Press Enter to close'
        exit 1
    }
}

# 10 - push
Write-Host ''
Log "Pushing to $Branch ..."
Write-Host ''
$pushArgs = @('push', '-u', 'origin', $Branch)
if ($Force) { $pushArgs += '--force-with-lease' }
& git @pushArgs
$exitCode = $LASTEXITCODE

Write-Host ''
Write-Host ('-' * 60) -ForegroundColor DarkGray
if ($exitCode -eq 0) {
    Ok 'Push complete'
    Write-Host ''
    Write-Host "  Repository : $RemoteUrl"
    Write-Host "  Branch     : $Branch"
    Write-Host "  Open       : $($RemoteUrl -replace '\.git$','')" -ForegroundColor Cyan
} else {
    Err 'Push failed'
    Write-Host ''
    Write-Host '  Common fixes:' -ForegroundColor Yellow
    Write-Host '   - Use a Personal Access Token instead of your password'
    Write-Host '     https://github.com/settings/tokens  (scope: repo)'
    Write-Host '   - Or authenticate once with GitHub CLI:  gh auth login'
    Write-Host "   - If the remote has commits you do not have:"
    Write-Host "     git pull origin $Branch --allow-unrelated-histories"
    Write-Host '   - To overwrite the remote (careful):'
    Write-Host '     .\push.ps1 -Force'
}
Write-Host ('-' * 60) -ForegroundColor DarkGray
Write-Host ''
Read-Host 'Press Enter to close'