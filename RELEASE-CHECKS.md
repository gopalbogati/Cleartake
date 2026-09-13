# 0.1.0 validation

Completed in the development environment:

- UI bundle compiles; main process and shell scripts pass syntax checks.
- Six Node tests pass, including real MP4 export with the exact npm media-tool binaries on Linux.
- Four Python tests pass for sound suggestions, speech protection and merging uncertain intervals.
- Local Google YAMNet loads and analyzes a two-second audio sample successfully.
- Export tests verify silence in muted intervals, audible retained intervals, shortened duration after cuts, unchanged source checksum, portrait dimensions, speed changes, webcam overlay and repeat export.
- Editor interaction test opens an imported project, creates mute and cut edits, undoes/redoes and passes the edit list into export.

The bundled FFmpeg does not include drawtext. Titles/captions use local SVG-to-PNG rasterization and one timed image overlay stream instead. The bundled-tool export test exercises this path.

Still required on an Apple Silicon Mac:

- Run Build-Mac.command and its bundled-helper checks; verify the resulting DMG.
- Open/install the application and grant the selected recording permissions.
- Record microphone, screen, optional computer audio and webcam; pause/resume, stop, reopen and export. Check synchronization through the full recording.
- Try real speech, sneezes and coughs; review missed detections and any flagged speech. No accuracy benchmark or guarantee has been established.
- Check the visual layout and keyboard accessibility in the actual application. Browser visual preview was blocked by the development browser's URL policy; it was not bypassed.
- Test a long recording and an interrupted recording recovery.
- For public binary distribution, complete Apple signing/notarization and the third-party corresponding-source/notice requirements.

Do not describe this source package as a Mac-tested or notarized release until those checks have been completed.
