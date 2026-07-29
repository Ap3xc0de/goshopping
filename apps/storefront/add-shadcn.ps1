Set-Location "C:\Users\usuario\Desktop\goshopping\apps\storefront"
$components = @("button","input","label","select","textarea","card","badge","dialog","sheet","tabs","accordion","separator","skeleton","dropdown-menu","navigation-menu","carousel","avatar","checkbox","radio-group","slider","switch","tooltip","popover","command","scroll-area","aspect-ratio","alert","toast","sonner")
foreach ($comp in $components) {
    Write-Host "Adding: $comp"
    npx shadcn@latest add $comp --yes 2>&1 | Write-Host
}
Write-Host "DONE"
