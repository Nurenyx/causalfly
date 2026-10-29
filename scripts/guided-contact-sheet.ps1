Add-Type -AssemblyName System.Drawing
$reviewRoot = Join-Path $PSScriptRoot '../docs/review/sprint-7'
$items = @(
 @('01-synthetic-ask-1920.png','ASK / one question'),
 @('03-synthetic-design-1920.png','TEST / approve the design'),
 @('04-synthetic-measured-compare-1920.png','TEST / measured before and after'),
 @('06-synthetic-meta-interpret-1920.png','UNDERSTAND / explanation + proposal'),
 @('08-fruitfly-observe-1920.png','LIVE CONNECTOME / recorded simulation'),
 @('10-fruitfly-meta-test-next-1920.png','FRUITFLY / explanation + next test'),
 @('11-fruitfly-compare-locked-1920.png','MATCHED EVIDENCE / requirements'),
 @('05-assistant-expanded-1920.png','ASK CAUSALFLY / persistent context'),
 @('04-synthetic-measured-compare-390.png','MOBILE / measured result')
)
$sheet = [Drawing.Bitmap]::new(1920,1260)
$graphics = [Drawing.Graphics]::FromImage($sheet)
$graphics.Clear([Drawing.ColorTranslator]::FromHtml('#00101a'))
$graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$font = [Drawing.Font]::new('Arial',14)
$brush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#a8eff5'))
for ($i=0; $i -lt $items.Count; $i++) {
 $x = ($i % 3) * 640; $y = [Math]::Floor($i / 3) * 420
 $graphics.DrawString($items[$i][1],$font,$brush,($x+12),($y+12))
 $img = [Drawing.Image]::FromFile((Join-Path $reviewRoot $items[$i][0]))
 $scale = [Math]::Min(616 / $img.Width,356 / $img.Height)
 $width = [int]($img.Width * $scale); $height = [int]($img.Height * $scale)
 $graphics.DrawImage($img,[int]($x+12+(616-$width)/2),[int]($y+46),$width,$height)
 $img.Dispose()
}
$graphics.DrawString('Sprint 7 final review | Offline Meta templates | Genuine recorded FruitFly evidence replay | No live provider calls',$font,$brush,12,1233)
$sheet.Save((Join-Path $reviewRoot 'contact-sheet.jpg'),[Drawing.Imaging.ImageFormat]::Jpeg)
$graphics.Dispose(); $sheet.Dispose(); $font.Dispose(); $brush.Dispose()
