param([int]$Port = 4173)

$root = $PSScriptRoot
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")

try {
  $listener.Start()
} catch {
  Write-Error "Could not listen on port $Port. Try: .\serve.ps1 -Port 8080"
  exit 1
}

Write-Host "Prism is running at http://localhost:$Port/ (Ctrl+C to stop)"

$types = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response

  try {
    $path = $request.Url.LocalPath
    if ($path -eq "/") { $path = "/index.html" }
    $file = [System.IO.Path]::GetFullPath((Join-Path $root $path.TrimStart("/")))
    $insideRoot = $file.StartsWith(
      $root + [System.IO.Path]::DirectorySeparatorChar,
      [System.StringComparison]::OrdinalIgnoreCase
    )

    if ($insideRoot -and (Test-Path $file -PathType Leaf)) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $extension = [System.IO.Path]::GetExtension($file)
      if ($types.ContainsKey($extension)) {
        $response.ContentType = $types[$extension]
      }
      $response.Headers.Add("Cache-Control", "no-store")
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $response.StatusCode = 404
      $message = [System.Text.Encoding]::UTF8.GetBytes("Not found")
      $response.OutputStream.Write($message, 0, $message.Length)
    }
  } catch {
    $response.StatusCode = 500
  } finally {
    $response.Close()
  }
}
