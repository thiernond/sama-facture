$path = 'c:\Users\MCNOTHIER\Desktop\SAMA FACTURE\js\app.js'
$str = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$str = $str.Replace([string][char]0xFFFD, "")
[System.IO.File]::WriteAllText($path, $str, [System.Text.Encoding]::UTF8)
Write-Host "Cleaned up"
