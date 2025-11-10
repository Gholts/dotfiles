------------------------------------------------------------------
-- SETTINGS
------------------------------------------------------------------
-- It will now target the button by its index number, Because fucking MacOS Doesn't have any labels or fucking descriptions.
-- 1 = MacBook Air Speakers
-- 2 = Airpods
-- 3 = Off
-- 4 = Transparency
-- 5 = Adaptive
-- 6 = Noise Cancellation
------------------------------------------------------------------
set targetModeIndex to 4 -- Change to What You Want to Set
------------------------------------------------------------------
-- These settings are confirmed to be correct (At least in MacOS 15 Sequoia)
set soundIconDescription to "Sound"
set controlCenterWindowName to "Control Center"
------------------------------------------------------------------
-- MAIN SCRIPT
------------------------------------------------------------------
tell application "System Events"
	tell process "ControlCenter"
		
		local soundMenuItem
		try
			-- PHASE 1: Click the "Sound" Status Item directly instead via Group of Contrl Center menu , That's a fucking trap.
			set soundMenuItem to the first menu bar item of menu bar 1 whose description is soundIconDescription
			click soundMenuItem
			
		on error errMsg
			display dialog "PHASE 1 FAILED: Could not click the 'Sound' status icon." & return & return & "Error: " & errMsg buttons {"OK"} default button 1
			return
		end try
		
		delay 0
		
		-- PHASE 2: Click the target mode button using its index.
		try
			set theWindow to window controlCenterWindowName
			
			-- The path is: window -> group 1 -> scroll area 1 -> checkboxes
			set theScrollArea to scroll area 1 of group 1 of theWindow
			
			-- Click the checkbox at the specified index.
			set targetButton to checkbox targetModeIndex of theScrollArea
			
			click targetButton
			
		on error errMsg
			display dialog "PHASE 2 FAILED: Could not click the target mode button at index " & targetModeIndex & "." & return & return & "Error: " & errMsg
			return
		end try

	end tell

        -- PHASE 3: Close the Sound menu after successful click.
        -- Simulate pressing the Escape key to dismiss the menu.
        delay 0
        key code 53

end tell

------------------------------------------------------------------
-- Provide a success confirmation
------------------------------------------------------------------
set modeName to "Unknown"
if targetModeIndex is 1 then set modeName to "MacBook Air Speakers"
if targetModeIndex is 2 then set modeName to "Airpods"
if targetModeIndex is 3 then set modeName to "Off"
if targetModeIndex is 4 then set modeName to "Transparency"
if targetModeIndex is 5 then set modeName to "Adaptive"
if targetModeIndex is 6 then set modeName to "Noise Cancellation"

display notification "Successfully switched to " & modeName & "." with title "AirPods Mode Control"
