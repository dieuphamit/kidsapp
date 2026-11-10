$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root
# Task Scheduler khong nap PATH cua shell tuong tac: them cho cai claude va uv
$env:PATH = "$env:USERPROFILE\.local\bin;$env:LOCALAPPDATA\Programs\Python\Python312\Scripts;$env:PATH"
$date = Get-Date -Format 'yyyy-MM-dd'
New-Item -ItemType Directory -Force "$root\ops\logs" | Out-Null
$log = "$root\ops\logs\$date-night.log"

# Doc output cua node la UTF-8 va ghi log UTF-8 (tranh UTF-16 cua *>> trong PS 5.1)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Stderr cua native exe bi PS 5.1 boc thanh ErrorRecord: tam thoi tat Stop de khong dung giua chung
$ErrorActionPreference = 'Continue'
& node "$PSScriptRoot\night-run.mjs" --until 06:30 2>&1 |
  ForEach-Object { "$_" } |
  Out-File -FilePath $log -Append -Encoding utf8
$code = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
exit $code
