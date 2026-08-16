$path = 'c:\Users\MCNOTHIER\Desktop\SAMA FACTURE\js\app.js'
$str = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$win1252 = [System.Text.Encoding]::GetEncoding(28591)
$originalBytes = $win1252.GetBytes($str)
$fixedStr = [System.Text.Encoding]::UTF8.GetString($originalBytes)
[System.IO.File]::WriteAllText($path, $fixedStr, [System.Text.Encoding]::UTF8)
Write-Host "Fixed successfully"
