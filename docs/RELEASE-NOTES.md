ClearTake development preview for Apple Silicon Mac and Windows x64.

## Downloads

- Mac: download the ARM64 ZIP or DMG. Extract/move ClearTake.app into Applications.
- Windows: download the x64 ZIP, extract all files into a folder, then open ClearTake.exe. Keep its companion files together.
- The Source code archives are for developers; they are not the installed application.

## Included

Screen/window recording, optional microphone/computer audio/webcam, pause/resume, local sound-event suggestions, manual mute/cut ranges, undo/redo, trim/speed, framing, backgrounds, webcam placement, titles, SRT caption import and MP4 export.

## Development status

The build workflow checks media exports and loads the bundled sound detector on each operating system. Native screen/microphone permissions, live recording, device synchronization and installer behavior still require manual testing. Detection can miss sounds or flag speech; review edits before sharing. Mac packages are ad-hoc signed, not Apple-notarized. Windows packages are not code-signed.

Original recordings are retained. Only exported media includes the enabled mute/cut edits.

## Before publishing this draft

Test both native builds and record any known issues here. Include applicable third-party notices and provide corresponding FFmpeg/FFprobe source/build materials through a license-compliant route as described in THIRD-PARTY.md. This draft is not a claim of completed native testing or binary licensing review.
