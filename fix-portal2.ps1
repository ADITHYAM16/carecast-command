$f = 'd:\My Projects\carecast-command-main\src\components\patient-portal.tsx'
$t = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)

# Fix doubled Locating pattern: {Locating..."Locating..." -> {locating ? "Locating..." 
$t = $t -replace '\{Locating\.\.\."Locating\.\.\."', '{locating ? "Locating..."'

# Fix Offline em-dash (? char) - replace with proper em dash
$t = $t -replace 'Offline \?" saved locally', 'Offline — saved locally'
$t = $t -replace 'Backend Offline \?" saved locally on this device\.', 'Backend offline — reports saved locally on this device.'
$t = $t -replace 'Backend Offline \?" saved locally and synced when reconnected\.', 'Backend offline — report will be saved locally and synced when reconnected.'

# Fix Required Resources label in selectedCause panel
$t = $t -replace '\{selectedCause\.label\} \?" Required Resources', '{selectedCause.label} — Required Resources'

[IO.File]::WriteAllText($f, $t, [Text.Encoding]::UTF8)
Write-Output 'Done'
