Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $PSScriptRoot "assets\logo.png"
if (-not (Test-Path $sourcePath)) {
    Write-Host "Source image not found: $sourcePath"
    exit 1
}

$img = [System.Drawing.Image]::FromFile($sourcePath)

function Resize-Icon($size, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Fill background with sleek deep sports dark #0b0e14
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(11, 14, 20))
    $g.FillRectangle($brush, 0, 0, $size, $size)
    $brush.Dispose()
    
    # Calculate fit
    $padding = [int]($size * 0.05)
    $availSize = $size - ($padding * 2)
    $ratio = [Math]::Min($availSize / $img.Width, $availSize / $img.Height)
    $w = [int]($img.Width * $ratio)
    $h = [int]($img.Height * $ratio)
    $x = [int](($size - $w) / 2)
    $y = [int](($size - $h) / 2)
    
    $g.DrawImage($img, $x, $y, $w, $h)
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created icon: $outputPath"
}

Resize-Icon 192 (Join-Path $PSScriptRoot "assets\icon-192.png")
Resize-Icon 512 (Join-Path $PSScriptRoot "assets\icon-512.png")
Resize-Icon 180 (Join-Path $PSScriptRoot "assets\apple-touch-icon.png")
$img.Dispose()
Write-Host "All icons generated successfully!"
