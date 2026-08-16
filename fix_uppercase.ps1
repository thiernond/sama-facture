$path = 'c:\Users\MCNOTHIER\Desktop\SAMA FACTURE\js\app.js'
$str = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# Replace replacement char + ?
$replacement = [char]0xFFFD + '?'

$str = $str.Replace($replacement + "mission", "Émission")
$str = $str.Replace($replacement + "mettez", "Émettez")
$str = $str.Replace($replacement + "cran", "Écran")

[System.IO.File]::WriteAllText($path, $str, [System.Text.Encoding]::UTF8)
Write-Host "Replaced broken uppercase characters"
