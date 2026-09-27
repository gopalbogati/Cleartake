# ClearTake product roadmap

ClearTake helps people turn screen recordings into clear demonstrations, tutorials and business presentations. Its core workflow combines local recording, reversible sound cleanup, subject-focused motion and export.

Status reviewed: 2026-09-27. This document separates available capabilities from future development work. Planned features have no committed release date.

## Motion design and verification approach

1. Test zoom-region persistence, bounded subject coordinates, smooth transitions, disabled regions, and cursor dwell suggestions.
2. Implement a shared motion evaluator and equivalent FFmpeg expressions. Keep original-video timestamps through cuts and speed changes.
3. Capture display cursor positions with an explicit recording option and pause-aware timing; persist them with projects. Window recordings and imports use manual focus regions until reliable window-coordinate tracking is available.
4. Add an editable zoom list, subject selection on the preview, automatic suggestions, and frame-rate preview updates. Preserve undo/redo, saving, and existing sound editing.
5. Verify with actual generated video exports, UI interaction tests, the existing suite, and a real Electron window launch. Document remaining gaps explicitly before committing.

## Capabilities and development status

| Capability | Current status | Details / next steps |
| --- | --- | --- |
| Display and window recording | Present | Electron capture; native permissions require interactive verification |
| Microphone and system audio | Present | Separate microphone stream; system support depends on OS |
| Recording to editor; pause/resume | Present | Preserve existing flow |
| Import video; save/reopen projects | Present | ClearTake JSON project format |
| Timeline trim/cut | Present, waveform selection | No multitrack clip rearrangement |
| Manual subject zoom and automatic suggestions | Present | Editable focus regions and pointer-dwell suggestions; verified below |
| Smooth focus transitions | Present | Shared motion model in preview and FFmpeg export |
| Continuous cursor-follow panning between subjects | Planned | Current motion focuses on stable subjects with smooth entry/exit |
| Regional speed changes | Planned | Global speed available today |
| Text/image/figure annotations | Partial | Opening title and SRT captions; no timed arbitrary annotations |
| Extra timeline audio tracks | Planned | Recorded mic/system tracks available today |
| Arbitrary crop controls | Planned | Aspect presets and center zoom available today |
| Cursor visibility, size and smoothing | Planned | OS cursor is baked into capture; telemetry for focus is separate |
| Cursor blur, bounce, sway, loop, custom assets | Planned | Requires cursor-free native capture and an overlay renderer |
| Webcam enable, size, corner placement | Present | Existing captured camera overlay |
| Webcam import/replace/remove | Planned | Recorded camera can currently be hidden |
| Webcam mirror, free position, margin, roundness, shadow, reactive scale | Planned | Corner placement and size controls available today |
| Wallpapers, custom backgrounds, gradients, background blur | Planned | Solid background available today |
| Frame padding and aspect presets | Present | Export and preview supported |
| Exported frame rounding and shadow | Planned | Preview container rounding is not an exported effect |
| MP4 export and reveal in Finder | Present | FFmpeg integration tests |
| Export quality and output dimensions | Partial | Fixed production/draft presets |
| GIF export, FPS, loop and size | Planned | MP4 available today |
| Customizable shortcuts and reference | Planned | Space playback shortcut available today |
| Editor preference persistence and preview recovery | Present | Per-project edits; repeated render test |
| Extensions | Under consideration | Requires a plugin architecture |
| Automatic speech captions | Planned | SRT import available today; sound detection is not transcription |

Release descriptions should reflect verified capabilities. Future features remain marked as planned until implementation and validation are complete.

## Verified in this update

- Subject zoom regions persist through save/reopen and undo/redo. Focus selection uses full source coordinates, including at edges; enabled overlaps are normalized deterministically.
- Pointer capture handles negative monitor origins, pause/resume timestamps, off-display positions and stopping. Suggestions require a sustained dwell and skip timing gaps. Tracking is whole-display only and capped at 60 minutes; live device permission flow was not exercised.
- Actual MP4 frames show the expected subject during a zoom and return to baseline. Transition frames are checked against the shared motion model, including after a cut and a 2× speed change. Oversampling avoids crop rounding steps.
- Existing mute/cut, sound-review rules, camera composition, captions, repeat preview, project save, website and UI tests pass.
- Actual visible Electron window tested with generated media and isolated storage: playback, focus transform, IPC save, and rendered preview export. Screenshot: `.build/motion-window.png` (local evidence, not committed).
- Verified FFmpeg 6.0 and 9.0.1 rendering. Fixed the removed `filter_complex_script` option for newer FFmpeg.
- Detected an x86_64 FFprobe in the dependency's `darwin/arm64` directory. Added architecture validation, native development fallback and native rebuild in the Mac packaging script. The new packaging fallback was syntax-checked, not run through the full model download/DMG pipeline.

Run `npm test`, `python3 tests/sound_test.py`, and `npm run test:window` to reproduce. No user recordings were captured or changed in verification. No DMG or Windows build was produced for this change.

## Development priorities

1. Native cursor-free capture and trustworthy window bounds, then custom cursor rendering, smoothing/blur/bounce/sway/loop and continuous camera-follow motion.
2. Regional speed/crop model, arbitrary timed annotations and extra audio tracks with timeline manipulation and one shared preview/export composition model.
3. Webcam import/replacement and transform/style options; wallpapers, gradients and exported frame effects.
4. GIF and configurable video output, shortcut customization/reference, and evaluation of an extension architecture.

Each milestone needs working recording/editor/export integration and regression tests before release.
