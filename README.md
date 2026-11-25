# Totally 90's Pinball

A modern-looking, 90s-loaded pinball game for Android, made for the Retroid Pocket 5. Pinball on steroids.

**Table 1: Mall Madness.** It has boombox pop bumpers, the REWIND and DIAL-UP ramps, a CRT TV jackpot target, floppy disk drop targets, a skill shot, Overdrive mode, and 6-ball Mega Multiball.

## Controls

| Button | Action |
| --- | --- |
| L1 | Left flipper |
| R2 | Right flipper |
| A | Hold, then release, to launch |
| D-pad | Nudge (too much nudging tilts the table) |
| Start | Pause |
| B | Pause, or quit to the title screen from the pause menu |

## Install

Every push to `main` runs GitHub Actions, which builds a signed APK and posts it under **Releases**. Download the newest APK on the device and install it. Updates install over the top because every build is signed with the same key, `app/t90p.keystore`.

## Project

- `app/src/main/assets/www/`: the game (canvas engine, physics, synth audio and music, all generated in code)
- `app/src/main/java/.../MainActivity.java`: fullscreen Android shell that passes controller buttons to the game
- Play it in a desktop browser by opening `index.html`. Keys: Z / M for the flippers, Space to launch, add `?demo=1` to the URL for attract mode.

Fonts: Archivo Black, Anton and Anonymous Pro (SIL Open Font License, included).
