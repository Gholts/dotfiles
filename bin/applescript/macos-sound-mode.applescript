------------------------------------------------------------------
-- Setting
------------------------------------------------------------------
-- I don't have other model, so I just finish my model.
-----------------------------------------------------AirPods_4_ANC
-- 1 = Off
-- 2 = Transparency
-- 3 = Adaptive
-- 4 = Noise Cancellation
------------------------------------------------------------------
set targetCheckboxIndex to 3 -- Noise Mode
set targetSoundLabel to "Sound" -- Localization
------------------------------------------------------------------
-- Main Script
------------------------------------------------------------------
tell application "System Events"
    tell process "ControlCenter"
        repeat with attempt from 1 to 2
            set windowReady to false

            ------------------------------------------------------------------
            -- Step 1: Check existing window
            ------------------------------------------------------------------
            try
                if (count of windows) > 0 then
                    if exists scroll area 1 of group 1 of window 1 then
                        set windowReady to true
                    end if
                end if
            on error
                set windowReady to false
            end try

            ------------------------------------------------------------------
            -- Step 2: Open Window
            ------------------------------------------------------------------
            if windowReady is false then

                repeat 5 times
                    if (count of windows) is 0 then exit repeat
                    delay 0.1
                end repeat
                set menuClickSuccess to false

                repeat 3 times
                    try
                        set soundItem to (first menu bar item of menu bar 1 whose description is targetSoundLabel)
                        click soundItem
                        set menuClickSuccess to true
                        exit repeat
                    on error
                        delay 0.1
                    end try
                end repeat

                if menuClickSuccess is false then
                    if attempt is 2 then error "The Sound Icon cannot be clicked."
                end if

                repeat 20 times
                    try
                        if (count of windows) > 0 then
                            if exists scroll area 1 of group 1 of window 1 then
                                set windowReady to true
                                exit repeat
                            end if
                        end if
                    end try
                    delay 0.1
                end repeat
            end if

            ------------------------------------------------------------------
            -- Step 3: Scan and Click
            ------------------------------------------------------------------
            if windowReady is true then
                try
                    set theWindow to window 1
                    set allElements to UI elements of scroll area 1 of group 1 of theWindow

                    set foundTriangle to false
                    set foundHeadingAfterTriangle to false
                    set checkboxCount to 0
                    set targetClicked to false

                    repeat with el in allElements
                        set elRole to role of el

                        if elRole is "AXDisclosureTriangle" then
                            set foundTriangle to true
                        end if

                        if foundTriangle is true and elRole is "AXHeading" then
                            set foundHeadingAfterTriangle to true
                        end if

                        if foundHeadingAfterTriangle is true and elRole is "AXCheckBox" then
                            set checkboxCount to checkboxCount + 1
                            if checkboxCount is targetCheckboxIndex then
                                click el
                                set targetClicked to true
                                exit repeat
                            end if
                        end if
                    end repeat

                    exit repeat

                on error errMsg
                    if attempt is 2 then
                        key code 53
                        return "Failed after retry: " & errMsg
                    end if
                    delay 0.15
                end try

            end if
        end repeat
    end tell

    ------------------------------------------------------------------
    -- Step 4: Cleanup
    ------------------------------------------------------------------
    delay 0.1
    key code 53
end tell
