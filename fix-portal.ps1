$f = 'd:\My Projects\carecast-command-main\src\components\patient-portal.tsx'
$bytes = [IO.File]::ReadAllBytes($f)
$latin = [Text.Encoding]::GetEncoding('iso-8859-1').GetString($bytes)

$latin = $latin -replace 'Demo credentials [^<\n]+</span>', 'Demo credentials</span>'
$latin = $latin -replace 'patient</span> [^<\n]+Password:', 'patient</span> · Password:'
$latin = $latin -replace 'Loading your reports[^<\n]+', 'Loading your reports...'
$latin = $latin -replace 'Locating[^"<\n]+"', 'Locating..."'
$latin = $latin -replace 'Signing in[^<\n]+</>', 'Signing in...</>'
$latin = $latin -replace 'Sending[^<\n]+</>', 'Sending...</>'
$latin = $latin -replace 'injuries[^"<\n]+"', 'injuries..."'
$latin = $latin -replace 'Offline [^<\n]+saved locally', 'Offline — saved locally'
$latin = $latin -replace 'Backend offline [^<\n]+reports saved locally on this device\.', 'Backend offline — reports saved locally on this device.'
$latin = $latin -replace 'Backend offline [^<\n]+report will be saved locally and synced when reconnected\.', 'Backend offline — report will be saved locally and synced when reconnected.'
$latin = $latin -replace '\{selectedCause\.label\} [^<\n]+Required Resources', '{selectedCause.label} — Required Resources'
$latin = $latin -replace '(?m)^  // [^\n]*Load reports[^\n]*$', '  // Load reports (never throws - falls back to localStorage)'
$latin = $latin -replace '(?m)^  // [^\n]*Submit emergency[^\n]*$', '  // Submit emergency (never throws - falls back to localStorage)'
$latin = $latin -replace '(?m)^  // [^\n]*Login screen[^\n]*$', '  // Login screen'
$latin = $latin -replace '(?m)^  // [^\n]*Portal dashboard[^\n]*$', '  // Portal dashboard'
$latin = $latin -replace '    // insertEmergency never throws [^\n]+', '    // insertEmergency never throws - uses localStorage if backend is down'

$outBytes = [Text.Encoding]::UTF8.GetBytes($latin)
[IO.File]::WriteAllBytes($f, $outBytes)
Write-Output 'Done'
