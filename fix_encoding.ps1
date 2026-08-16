$bytes = [System.IO.File]::ReadAllBytes('c:\Users\MCNOTHIER\Desktop\SAMA FACTURE\js\app.js')
$str = [System.Text.Encoding]::GetEncoding(28591).GetString($bytes)
[System.IO.File]::WriteAllText('c:\Users\MCNOTHIER\Desktop\SAMA FACTURE\js\app.js', $str, [System.Text.Encoding]::UTF8)
Write-Host "Encoding fixed"
