$ErrorActionPreference = 'Stop'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\night-run.ps1`""
$trigger = New-ScheduledTaskTrigger -Daily -At 23:00
$settings = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 8)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'BeHoc-NightRun' -Action $action -Trigger $trigger -Settings $settings `
  -Principal $principal -Description 'Bé Học: agent chạy task qua đêm' -Force | Out-Null
Write-Host 'Đã đăng ký task BeHoc-NightRun: chạy hằng ngày lúc 23:00 (giới hạn 8 giờ).'
Write-Host 'Máy cần đang đăng nhập (khóa màn hình được, không được đăng xuất).'
