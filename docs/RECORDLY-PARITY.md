# Recordly comparison and motion implementation

Baseline: ClearTake `80d3b0f`; comparison against the public feature inventory in
[Recordly README](https://github.com/webadderallorg/Recordly#all-features), inspected 2026-09-27.
This is a functionality comparison, not copied Recordly code. ClearTake remains an independent implementation.

## Implementation plan

1. Test zoom-region persistence, bounded subject coordinates, smooth transitions, disabled regions, and cursor dwell suggestions.
2. Implement a shared motion evaluator and equivalent FFmpeg expressions. Keep original-video timestamps through cuts and speed changes.
3. Capture display cursor positions with an explicit recording option and pause-aware timing; persist them with projects. Window recordings and imports use manual focus regions until reliable window-coordinate tracking is available.
4. Add an editable zoom list, subject selection on the preview, automatic suggestions, and frame-rate preview updates. Preserve undo/redo, saving, and existing sound editing.
5. Verify with actual generated video exports, UI interaction tests, the existing suite, and a real Electron window launch. Document remaining gaps explicitly before committing.

## Feature coverage

| Recordly capability | ClearTake baseline | Verification / remaining scope |
| --- | --- | --- |
| Display and window recording | Present | Electron capture; native permissions require interactive verification |
| Microphone and system audio | Present | Separate microphone stream; system support depends on OS |
| Recording to editor; pause/resume | Present | Preserve existing flow |
| Import video; save/reopen projects | Present | ClearTake JSON project format |
| Timeline trim/cut | Present, waveform selection | No multitrack clip rearrangement |
| Manual subject zoom and automatic suggestions | Missing | Added and tested in this change; see final verification below |
| Smooth focus transitions | Missing | Added in preview and FFmpeg export |
| Continuous cursor-follow panning between subjects | Missing | This update focuses on stable subjects with smooth entry/exit; no continuous tracking camera |
| Regional speed changes | Missing | Global speed only |
| Text/image/figure annotations | Partial | Opening title and SRT captions; no timed arbitrary annotations |
| Extra timeline audio tracks | Missing | Recorded mic/system tracks only |
| Arbitrary crop controls | Missing | Existing aspect and center zoom only |
| Cursor visibility, size and smoothing | Missing | OS cursor is baked into capture; telemetry for focus is separate |
| Cursor blur, bounce, sway, loop, custom assets | Missing | Requires cursor-free native capture and an overlay renderer |
| Webcam enable, size, corner placement | Present | Existing captured camera overlay |
| Webcam import/replace/remove | Missing | Recorded camera can only be hidden |
| Webcam mirror, free position, margin, roundness, shadow, reactive scale | Missing | Not equivalent to existing corner controls |
| Wallpapers, custom backgrounds, gradients, background blur | Missing | Solid background only |
| Frame padding and aspect presets | Present | Export and preview supported |
| Exported frame rounding and shadow | Missing | Preview container rounding is not an exported effect |
| MP4 export and reveal in Finder | Present | FFmpeg integration tests |
| Export quality and output dimensions | Partial | Fixed production/draft presets |
| GIF export, FPS, loop and size | Missing | MP4 only |
| Customizable shortcuts and reference | Missing | Space playback shortcut only |
| Editor preference persistence and preview recovery | Present | Per-project edits; repeated render test |
| Extensions / marketplace | Missing | No plugin host |
| Automatic speech captions | Missing | SRT import only; sound detection is not transcription |

The table deliberately keeps absent features visible. This motion update does not establish full Recordly parity.

## Verified in this update

- Subject zoom regions persist through save/reopen and undo/redo. Focus selection uses full source coordinates, including at edges; enabled overlaps are normalized deterministically.
- Pointer capture handles negative monitor origins, pause/resume timestamps, off-display positions and stopping. Suggestions require a sustained dwell and skip timing gaps. Tracking is whole-display only and capped at 60 minutes; live device permission flow was not exercised.
- Actual MP4 frames show the expected subject during a zoom and return to baseline. Transition frames are checked against the shared motion model, including after a cut and a 2× speed change. Oversampling avoids crop rounding steps.
- Existing mute/cut, sound-review rules, camera composition, captions, repeat preview, project save, website and UI tests pass.
- Actual visible Electron window tested with generated media and isolated storage: playback, focus transform, IPC save, and rendered preview export. Screenshot: `.build/motion-window.png` (local evidence, not committed).
- Verified FFmpeg 6.0 and 9.0.1 rendering. Fixed the removed `filter_complex_script` option for newer FFmpeg.
- Detected an x86_64 FFprobe in the dependency's `darwin/arm64` directory. Added architecture validation, native development fallback and native rebuild in the Mac packaging script. The new packaging fallback was syntax-checked, not run through the full model download/DMG pipeline.

Run `npm test`, `python3 tests/sound_test.py`, and `npm run test:window` to reproduce. No user recordings were captured or changed in verification. No DMG or Windows build was produced for this change.

## Remaining parity work, in dependency order

1. Native cursor-free capture and trustworthy window bounds, then custom cursor rendering, smoothing/blur/bounce/sway/loop and continuous camera-follow motion.
2. Regional speed/crop model, arbitrary timed annotations and extra audio tracks with timeline manipulation and one shared preview/export composition model.
3. Webcam import/replacement and transform/style options; wallpapers, gradients and exported frame effects.
4. GIF and configurable video output, shortcut customization/reference, and a plugin host if compatible with ClearTake's independent architecture.

These are separate substantial features, not features that can honestly be marked complete by adding a checkbox or copying settings labels.
