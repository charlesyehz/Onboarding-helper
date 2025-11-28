1. The Trigger Widget (Initial State)
   The trigger is the clickable icon that opens the pop-up.
   Icon
   Use a subtle, recognizable symbol (e.g., a wand/sparkle ✨ or a magic/auto-fill symbol).
   Location (Smart Stack Approach)
   Position the icon inside the right side of the active input field.

Default Position: ≈10px from the right edge (if no conflict is detected)
Conflict Position (Smart Stack): If a conflicting icon (e.g., from a password manager like 1Password) is detected, dynamically shift the icon to the left (≈40px to 60px from the right edge) to stack next to the existing icon, not on top of it
Fallback: If dynamic positioning is unreliable, place the icon immediately outside, below the bottom-right corner of the input field

Visibility
The icon should be subtle or only appear when the user focuses on the input field or hovers near the area.

2. The Pop-up / Tooltip (Active State)
   The pop-up appears when the trigger icon is clicked and must be highly functional.
   Positioning
   Must appear as a compact, functional card directly below or adjacent to the input field/trigger icon. It should include a visual "pointer" or "tail" connecting it to the trigger icon.
   Z-Index (Conflict Resolution)
   Must use a maximal z-index (e.g., z-index: 2147483647) to guarantee it appears above all other page elements and extension pop-ups.
   Content
   A clean, vertical list of clickable action items (buttons or rows).

Each item must clearly display the Action Type (e.g., "Email - Personal") and a Truncated Preview of the data (e.g., user@gmail.com)

Interaction

Clicking an option instantly fills the input field
The pop-up must automatically dismiss upon successful fill or when the user clicks outside the panel

3. Conflict Mitigation (Post-Fill)
   This step ensures the data remains in the field after insertion.
   DOM Event Trigger
   After successfully inserting the pre-fill data, trigger a synthetic change and input event on the input field element. This action helps prevent other scripts and extensions from immediately overriding the newly filled value.
