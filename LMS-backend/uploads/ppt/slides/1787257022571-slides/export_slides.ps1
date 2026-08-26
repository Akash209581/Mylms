
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.Office.Interop.PowerPoint -ErrorAction SilentlyContinue
$pptApp = New-Object -ComObject PowerPoint.Application
$pptApp.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue
try {
  $pptFile = $pptApp.Presentations.Open('C:\\Users\\banda\\Desktop\\LMS\\LMS-backend\\uploads\\ppt\\1787257022565-2.4._Feature_Store.pptx', $true, $false, $false)
  $slideCount = $pptFile.Slides.Count
  Write-Output "SLIDE_COUNT:$slideCount"
  for ($i = 1; $i -le $slideCount; $i++) {
    $outPath = 'C:\\Users\\banda\\Desktop\\LMS\\LMS-backend\\uploads\\ppt\\slides\\1787257022571-slides\\slide_$i.png'
    $pptFile.Slides($i).Export($outPath, 'PNG', 1920, 1080)
    Write-Output "SLIDE_EXPORTED:$i"
  }
  $pptFile.Close()
} finally {
  $pptApp.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pptApp) | Out-Null
}
