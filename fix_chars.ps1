$path = 'c:\Users\MCNOTHIER\Desktop\SAMA FACTURE\js\app.js'
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

$content = $content.Replace('ÃƒÂ©', 'é')
$content = $content.Replace('ÃƒÂ¨', 'è')
$content = $content.Replace('ÃƒÂ ', 'à')
$content = $content.Replace('ÃƒÂ§', 'ç')
$content = $content.Replace('ÃƒÂª', 'ê')
$content = $content.Replace('ÃƒÂ®', 'î')
$content = $content.Replace('ÃƒÂ´', 'ô')
$content = $content.Replace('ÃƒÂ', 'à') # catch-all for some remaining broken 'à' if space followed

$content = $content.Replace('Ã©', 'é')
$content = $content.Replace('Ã¨', 'è')
$content = $content.Replace('Ã ', 'à')
$content = $content.Replace('Ã§', 'ç')
$content = $content.Replace('Ãª', 'ê')
$content = $content.Replace('Ã®', 'î')
$content = $content.Replace('Ã´', 'ô')

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "Replaced broken characters"
