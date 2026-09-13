# ClearTake 0.1.0 validation

## Native package checks completed

[GitHub Actions build 34749391545](https://github.com/gopalbogati/Cleartake/actions/runs/34749391545), commit `1a5b271cc4bec9b2847e0d6fcd0563cbf40257c9`, completed both platform packaging jobs on 13 September 2026:

- Apple Silicon Mac: DMG and ZIP built; DMG checksum verification and ZIP integrity check passed.
- Windows x64: app ZIP built and SHA-256 checksum generated.
- Each operating system passed all 14 Node tests and four Python sound-detection tests.
- The bundled sound detector loaded its local model and analyzed test audio before packaging and again from the packaged application's resources on both operating systems.
- FFmpeg and FFprobe were compiled from source on each platform. Matching FFmpeg, x264 and zlib source archives, the build script, configuration records and compiler identity accompany the release packages.

The automated media tests exercise real exports: source preservation, muted intervals, retained audio, cuts, titles/captions, portrait dimensions, speed changes, webcam overlay and repeated export. Editor interaction tests exercise manual edits and undo/redo. Website tests check release asset selection and both Vercel build roots.

## Device testing still required

These build checks do not exercise a person recording with an actual screen, microphone or camera. The following still need manual testing on both supported operating systems:

- Install/open the app and grant the selected recording permissions.
- Record screen/window, microphone, optional computer audio and webcam; pause/resume, stop, reopen and export. Check synchronization throughout the recording.
- Try real speech, sneezes and coughs; review missed detections and any flagged speech. No accuracy benchmark or guarantee has been established.
- Check layout, keyboard accessibility, long recordings and interrupted-recording recovery.

This is a development preview. Mac packages use ad-hoc signing and are not Apple-notarized. Windows packages are not code-signed. Do not describe this release as having passed native recording or installation testing until those tests have been performed.
