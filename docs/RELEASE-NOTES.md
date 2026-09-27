## ClearTake 0.1.2 — Subject focus and smooth zoom

Highlight the subject of a walkthrough with editable zoom regions. Select a moment, click **Zoom selected moment**, then **Point to subject**. Adjust timing, strength and smooth entry/exit; undo/redo and project saving preserve the changes. Preview and MP4 export use the same motion, including after cuts and speed changes.

Whole-display recordings can track pointer positions locally and suggest zooms from pauses in pointer movement. Tracking respects recording pause/resume, ignores other displays, and covers up to the first 60 minutes. Window recordings and imported videos support manual subject zoom. Suggestions are editable and are not face/object detection or continuous cursor-follow motion.

This release also improves low-resolution zoom smoothness, supports newer FFmpeg filter options and validates Mac media-tool architecture before packaging. A native development fallback handles incompatible dependency binaries; packaged apps use their bundled tools.

Validation includes 25 JavaScript tests, four sound-review tests, actual encoded motion frames, a real Mac editor window and rendered preview with generated media. The release workflow additionally checks packaged-app startup and the bundled detector on each platform, and verifies Mac code signatures. These checks do not replace live recording tests or Apple notarization.

ClearTake development preview for Apple Silicon Mac and Windows x64.

## Downloads

- Mac: download the ARM64 ZIP or DMG. Extract/move ClearTake.app into Applications.
- Windows: download the x64 ZIP, extract all files into a folder, then open ClearTake.exe. Keep its companion files together.
- The Source code archives are for developers; they are not the installed application.

## Included

Screen/window recording, optional microphone/computer audio/webcam, pause/resume, local sound-event suggestions, manual mute/cut ranges, undo/redo, trim/speed, subject-focused zoom regions, pointer-based zoom suggestions, framing, solid backgrounds, webcam placement, titles, SRT caption import and MP4 export.

## Development status

The build workflow checks media exports and loads the bundled sound detector on each operating system. Native screen/microphone permissions, live recording, device synchronization and installer behavior still require manual testing. Detection can miss sounds or flag speech; review edits before sharing. Mac packages are ad-hoc signed, not Apple-notarized. Windows packages are not code-signed.

Original recordings are retained. Only exported media includes the enabled mute/cut edits.

## Media-tool source

The release includes matching FFmpeg, x264 and zlib source archives, the build script, compiler identity and configure logs in the two `ClearTake-Media-Source-*.tar.gz` files. Dependency notices are also bundled inside the app. These source archives are for developers and are not needed to run ClearTake.
