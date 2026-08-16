$content = Get-Content -Raw "c:\Users\MCNOTHIER\Desktop\SAMA FACTURE\js\app.js"

# Find event listeners with await inside
$content = [regex]::Replace($content, "addEventListener\('([^']+)',\s*\(\)\s*=>\s*\{", "addEventListener(`'$1`', async () => {")
$content = [regex]::Replace($content, "addEventListener\('([^']+)',\s*\(e\)\s*=>\s*\{", "addEventListener(`'$1`', async (e) => {")

# confirmDelete callback
$content = [regex]::Replace($content, "this\.confirmDelete\('([^']+)',\s*\(\)\s*=>\s*\{", "this.confirmDelete(`'$1`', async () => {")

Set-Content -Path "c:\Users\MCNOTHIER\Desktop\SAMA FACTURE\js\app.js" -Value $content
