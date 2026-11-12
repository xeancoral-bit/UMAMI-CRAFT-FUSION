@echo off
:: Umami Craft Fusion - allow phones on the same Wi-Fi to open the kiosk QR link
echo =========================================================================
echo    Umami Craft Fusion - Windows Firewall ^& Wi-Fi Network Configuration
echo =========================================================================
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Administrator privileges required!
    echo Please right-click this file and select "Run as administrator".
    echo.
    pause
    exit /b 1
)

echo [1/4] Removing old "Node.js" BLOCK rules (created when the firewall popup was cancelled)...
powershell -NoProfile -Command "Get-NetFirewallRule -Direction Inbound -Action Block -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -match 'node' } | Remove-NetFirewallRule -ErrorAction SilentlyContinue"

echo [2/4] Opening TCP ports 3000-3003, 3010, 3020 for all network profiles...
netsh advfirewall firewall delete rule name="Umami Restaurant Kiosk Ports 3000-3001" >nul 2>&1
netsh advfirewall firewall delete rule name="Umami Restaurant Kiosk Ports" >nul 2>&1
netsh advfirewall firewall add rule name="Umami Restaurant Kiosk Ports" dir=in action=allow protocol=TCP localport=3000,3001,3002,3003,3010,3020 profile=any

echo [3/4] Allowing node.exe through the firewall...
for /f "delims=" %%N in ('where node 2^>nul') do (
    netsh advfirewall firewall delete rule name="Umami Node.js Server" program="%%N" >nul 2>&1
    netsh advfirewall firewall add rule name="Umami Node.js Server" dir=in action=allow program="%%N" profile=any
)

echo [4/4] Setting the active Wi-Fi network to Private (Public networks block local devices)...
powershell -NoProfile -Command "Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq 'Public' } | Set-NetConnectionProfile -NetworkCategory Private"

echo.
echo [SUCCESS] Firewall and network configured.
echo Phones connected to the SAME Wi-Fi can now open the kiosk QR link.
echo.
pause
