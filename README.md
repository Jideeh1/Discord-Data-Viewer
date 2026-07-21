# Render Alert
<p align="center">
  <img src="/.Media/Blender_Alert ALT.png">
</p>
<p align="center">
  <a href="https://github.com/Jideeh1/Render-Alert/blob/main/LICENSE"><img alt="GitHub license" src="https://img.shields.io/github/license/festivities/Flow?style=for-the-badge"></a><br>
    <a href="https://github.com/Jideeh1/Render-Alert/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/Jideeh1/Render-Alert?style=for-the-badge"></a>
    <a href=""><img alt="Discord" src="https://img.shields.io/badge/Version-v1.0.0-brightgreen?style=for-the-badge"></a>
    <a href="https://github.com/Jideeh1/Render-Alert/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/Jideeh1/Render-Alert?style=for-the-badge"></a>
</p>

---

Render Alert is a Blender add-on that plays a sound when a render finishes.

It's accessible in both:

- Render Properties panel
- 3D Viewport N-panel

You can use the default system beep or choose a custom audio file.

## Installion and Usage


https://github.com/user-attachments/assets/6ca23323-7cfb-44a2-adb6-676c6b122ef4


---

## Notify Phone Setup
### Install ntfy app
Open your phone's app store, search for **ntfy**, and install it.
 
- Android (Google Play): search "ntfy"
- iPhone (App Store): search "ntfy"
### Subscribe to a topic
A "topic" is just a name you make up. Anything sent to that topic name shows up as a notification on your phone.
 
1. Open the ntfy app.
2. Tap the **+** button (or **Subscribe to topic**).
3. Type a topic name. **Make it long and hard to guess**, because anyone who knows the name can send you notifications. For example:
```
   jideeh-render-alert-8x2k
```
 
4. Tap **Subscribe**.
That's your topic. Keep it handy for the next step.
### Turn on Notify Phone in Blender
1. In Blender, open the Render Alert settings. You can find them in either place:
   - **Properties → Render → Render Alert Sound**, or
   - **3D Viewport → N panel → Render Alert** tab.
2. Tick **Notify Phone**.
3. In the **ntfy Topic** field, paste the *exact same* topic name you subscribed to in Step 2.
4. Leave **Server** as `https://ntfy.sh` unless you run your own ntfy server.
Optionally, customize what the notification says:
 
- **Title** — the bold heading on the notification (default: `Blender`).
- **Message** — the notification text (default: `Render complete!`).
### Make sure online access is on
Blender has a global switch that controls whether add-ons are allowed to use the internet. Render Alert respects it, so if it's off, no notification is sent (your render sound still plays).
 
To check it: **Edit → Preferences → System → Network → Allow Online Access**, and make sure it's enabled.
 
If online access is off, the Render Alert panel shows a warning and the Test button tells you no notification was sent.

## Features
- Notifies Phone when rendering is complete
- Plays an alert when rendering is complete
- Supports a default system beep
- Supports custom sound files
- Adds controls to the Render Properties panel
- Adds controls to the 3D Viewport N-panel
- Includes a test button for checking the selected alert sound
- Uses Blender's built-in audio system for broader audio format support

## Audio Format Support

On Windows, `.wav` files can be played with Python's `winsound`.

For other formats, Render Alert uses Blender's built-in `aud` module. Blender's audio API can load sound files such as `.ogg`, and its documented codec/container list includes formats such as MP3, OGG/Vorbis, FLAC, and WAV. 【2-a72853】

Recommended formats:

- `.wav`
- `.ogg`
- `.mp3`
- `.flac`

Actual playback support can still depend on the Blender build and the audio file itself.

## Compatibility

Render Alert is designed for Blender 3.6 and newer.

For Blender 3.6 to 4.1, install it as a regular legacy add-on.

For Blender 4.2 and newer, it can also be packaged as a Blender extension using `blender_manifest.toml`.

### Legacy Add-on Installation

1. Download the add-on Python file.
2. Open Blender.
3. Go to `Edit > Preferences > Add-ons`.
4. Click `Install`.
5. Select the add-on file.
6. Enable `Render Alert`.
