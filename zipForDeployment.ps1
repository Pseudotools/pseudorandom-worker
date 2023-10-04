# Delete the existing deployment-package.zip if it exists
if (Test-Path .\deployment-package.zip) {
    Remove-Item .\deployment-package.zip -Force
    Write-Host "Existing deployment-package.zip deleted."
}

# Compile TypeScript to JavaScript
tsc

# Navigate to the dist directory
Set-Location -Path .\dist

# Create a zip file of the contents of dist
Get-ChildItem -Recurse | Compress-Archive -DestinationPath ..\deployment-package.zip

# Navigate back to the parent directory
Set-Location ..

# Add node_modules to the zip
Compress-Archive -Path .\node_modules -Update -DestinationPath .\deployment-package.zip
