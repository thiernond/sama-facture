$path = 'c:\Users\MCNOTHIER\Desktop\SAMA FACTURE\js\app.js'
$str = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# Replaces for question marks that used to be emojis or accented chars
$str = $str.Replace("? Brouillon", "📝 Brouillon")
$str = $str.Replace("? Envoy", "📤 Envoy")
$str = $str.Replace("? Partiellement", "⏳ Partiellement")
$str = $str.Replace("? Pay", "✅ Pay")
$str = $str.Replace("Derniers Documents ?mis", "Derniers Documents Émis")
$str = $str.Replace("Envoyé / ?mis", "Envoyé / Émis")
$str = $str.Replace("Envoy / ?mis", "Envoyé / Émis")
$str = $str.Replace("Envoy / Émis", "Envoyé / Émis")
$str = $str.Replace("Client inconnu' : '?""", "Client inconnu' : '—'")
$str = $str.Replace("doc.client.name : '?""", "doc.client.name : '—'")

# Clean up any remaining replacement characters (0xFFFD) near our words
$str = $str.Replace("Envoy(e)", "Envoyé(e)")
$str = $str.Replace("paye", "payée")
$str = $str.Replace("Paye", "Payée")
$str = $str.Replace("Rgle", "Réglée")
$str = $str.Replace("cr", "créé")
$str = $str.Replace("Crer un", "Créer un")
$str = $str.Replace("Crer le document", "Créer le document")
$str = $str.Replace("cet lment ? Cette action est irrversible", "cet élément ? Cette action est irréversible")
$str = $str.Replace("Rglement  rception", "Règlement à réception")
$str = $str.Replace("chque  l'ordre", "chèque à l'ordre")
$str = $str.Replace("Rglement par virement", "Règlement par virement")
$str = $str.Replace("Tl:", "Tél:")

[System.IO.File]::WriteAllText($path, $str, [System.Text.Encoding]::UTF8)
