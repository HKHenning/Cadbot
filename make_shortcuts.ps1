$ws = New-Object -ComObject WScript.Shell

$s1 = $ws.CreateShortcut('C:\Users\HKris\Desktop\CadBot.lnk')
$s1.TargetPath = 'http://localhost:5173'
$s1.Save()

$s2 = $ws.CreateShortcut('C:\Users\HKris\Desktop\Launch CadBot.lnk')
$s2.TargetPath = 'C:\Users\HKris\Desktop\Launch CadBot.bat'
$s2.WorkingDirectory = 'C:\Users\HKris\CadBot'
$s2.WindowStyle = 1
$s2.Save()

Write-Host 'Shortcuts created'
