$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Server started at http://localhost:$port/"
while ($listener.IsListening) {
    $context = $listener.GetContext()
    $response = $context.Response
    $localPath = $context.Request.Url.LocalPath
    if ($localPath -eq "/") { $localPath = "/index.html" }
    $filePath = Join-Path (Get-Location) $localPath.TrimStart("/").Replace("/", "\")
    if (Test-Path $filePath -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentLength64 = $bytes.Length
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        if ($ext -eq ".html") { $response.ContentType = "text/html" }
        elseif ($ext -eq ".css") { $response.ContentType = "text/css" }
        elseif ($ext -eq ".js") { $response.ContentType = "application/javascript" }
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.StatusCode = 200
    } else {
        $response.StatusCode = 404
    }
    $response.Close()
}
