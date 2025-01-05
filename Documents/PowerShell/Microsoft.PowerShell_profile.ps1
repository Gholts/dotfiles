Invoke-Expression (&starship init powershell)
$ENV:STARSHIP_CONFIG = "$HOME\starship.toml"
fastfetch

# git repository greeter
$global:lastRepository = $null

function Check-DirectoryForNewRepository {
    $currentRepository = git rev-parse --show-toplevel 2>$null
    if ($currentRepository -and ($currentRepository -ne $global:lastRepository)) {
        onefetch
    }
    $global:lastRepository = $currentRepository
}

function Set-Location {
    param (
        [string]$path
    )

    # Use the default Set-Location to change the directory
    Microsoft.PowerShell.Management\Set-Location -Path $path

    # Check if we are in a new Git repository
    Check-DirectoryForNewRepository
}

# Optional: Check the repository also when opening a shell directly in a repository directory
# Uncomment the following line if desired
#Check-DirectoryForNewRepository

#f45873b3-b655-43a6-b217-97c00aa0db58 PowerToys CommandNotFound module

Import-Module -Name Microsoft.WinGet.CommandNotFound
#f45873b3-b655-43a6-b217-97c00aa0db58
