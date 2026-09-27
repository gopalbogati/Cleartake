<p align="center"><img src="assets/icons/app.png" width="110" alt="ClearTake logo"></p>

# ClearTake

**Version: 0.1.0 · Development preview**

ClearTake is a local macOS screen recorder and editor with sneeze/cough detection, reversible audio muting, video cuts, captions and MP4 export.

Source code is available. Downloadable app packages are published separately in [GitHub Releases](https://github.com/gopalbogati/Cleartake/releases).

**Record → review sounds → mute or cut → export MP4.**

## See it work

![ClearTake — record, find the sneeze, mute or cut it, export](docs/media/cleartake-promo.gif)

*Record naturally. Something interrupts you. Keep going — when you stop, a sound
model running on your own machine finds the sneezes, the coughs and the throat
clearing, and you mute or cut each one. Untick it and the moment comes back.*

[**Watch the 54-second version with sound →**](docs/media/cleartake-promo.mp4?raw=1)

ClearTake brings recording, sound review, subject-focused motion and video editing into one local workspace. Its project format preserves original media and reversible edits. Supported videos can also be imported from other tools. Third-party components are listed in [THIRD-PARTY.md](THIRD-PARTY.md).

## What you can do

- Record a screen or window, with optional microphone, computer audio and webcam.
- Pause and resume recording.
- Find possible sneezes, coughs, throat clearing and sniffs with a local sound model.
- Listen to suggestions; enable, disable or remove each edit.
- Drag across the waveform or enter start/end times to select **any** unwanted moment.
- **Mute sound:** silence the selected audio while keeping the picture.
- **Cut from video:** remove the selected time from both picture and sound.
- Mute microphone only, or all audio. Separate microphone and computer volume controls.
- Trim the beginning/end, change speed, and apply gentle microphone noise reduction on export.
- Choose landscape, portrait or square framing, a background color, padding and center zoom.
- Add subject-focused zoom regions with smooth entry/exit, adjustable timing and strength, and click-to-position focus.
- Track the pointer in whole-display recordings and generate editable zoom suggestions from pointer pauses.
- Move and resize the webcam overlay.
- Add an opening title; import SRT captions timed to the original video. Captions follow cuts and speed changes.
- Undo/redo edits, reopen saved projects, listen to the original, render a preview and export MP4.

Original media is retained. Edits live in a project file until you render/export. There are no accounts, subscriptions, API keys, analytics or recording uploads.

## Focus on a subject with smooth zoom

1. Select a moment by dragging the waveform or entering **From / To** times.
2. Click **Zoom selected moment** in **Focus & smooth zoom**.
3. Click **Point to subject**, then click the subject in the full source picture. ClearTake previews that focus.
4. Adjust **Zoom ×** (up to 3×), **Ease (s)**, and the region's start/end times. The green strip on the waveform marks each zoom. Use the region checkbox or **Remove** to disable or delete it; undo/redo is supported.
5. Play the edit or render a preview. Export uses the same focus coordinates and easing, including after cuts and playback-speed changes.

For suggestions, enable **Track pointer for zoom suggestions** before recording a whole display. In the editor, click **Suggest zooms**. It finds pointer pauses, not faces or semantic objects; review the results. Repeating this action refreshes suggestions while retaining manual regions. Pointer tracking stops while recording is paused, ignores other displays, and is limited to the first 60 minutes. Positions are stored only in the local project JSON.

Imported videos, older projects, and single-window recordings do not have a usable pointer track; manual subject zoom still works. The actual OS cursor remains part of the video. Cursor replacement, blur, bounce and continuous cursor-follow panning are not implemented. Zoom regions do not overlap and currently return to the base framing between subjects.

See the [ClearTake product roadmap](docs/PRODUCT-ROADMAP.md) for current capabilities, verification results and future development priorities.

## Download website and Windows/Mac ZIPs

A Vercel-ready download website is included. Import this repository into Vercel with the root directory set to `./` or `engine`; both include a `vercel.json` that configures the static website build. It displays only app ZIPs that exist in published GitHub releases.

Run **Actions → Build Mac and Windows downloads** to build both platforms. With **Publish downloads** enabled, successful builds publish a development preview and activate the website download buttons. See [website deployment and release instructions](docs/DOWNLOAD-WEBSITE.md).

On Windows with Node 22+ x64 and Python 3.12 installed, run `Build-Windows.cmd` to create a local Windows ZIP. Extract the full ZIP before opening ClearTake.exe.

## Build the Mac installer

**Apple Silicon (M1 or newer), macOS 14.2 or later.** Computer audio availability also depends on macOS permissions and the chosen capture source.

1. Extract this project to a new folder, separate from your previous ClearTake source.
2. If needed, install [Homebrew](https://brew.sh), then run:

   ```sh
   brew install node@22 python@3.12 pkg-config
   ```

3. Open Terminal in this folder and run:

   ```sh
   bash Build-Mac.command
   ```

The script installs dependencies, downloads the local sound model, bundles the Python detector, runs checks and creates:

```text
release/ClearTake-Mac-0.1.0-arm64.dmg
```

The first build downloads several large dependencies and needs several GB of free disk space. The script checks native media-tool architecture; if an npm-provided binary is incompatible, it builds FFmpeg/FFprobe from source with Xcode command-line tools and pkg-config. No model/API credentials are needed. Subsequent app recording and sound analysis run locally.

Open the DMG and drag **ClearTake** into Applications. It has a new application ID. Replacing a previous application with the same display name does not delete its recordings; keep those recordings backed up. macOS will ask for Screen Recording, Microphone and Camera permissions as applicable. If macOS blocks your own unsigned development build, use **System Settings → Privacy & Security → Open Anyway**, then reopen it. Do not disable Gatekeeper globally.

The development DMG uses ad-hoc signing. Apple Developer signing and notarization are separate distribution steps and are not configured. This source package was prepared and media-tested on Linux; native Mac capture and DMG installation still require testing on a Mac.

## The easiest way to edit a sneeze

1. Stop the recording. The editor opens, and detection runs if its checkbox was enabled.
2. Click **Listen** beside a possible sneeze. This plays the original around that moment.
3. Choose **Mute sound** to keep the video, or **Cut moment** to remove the entire moment. Check the row to apply it. Uncheck it to restore that moment.
4. If detection missed it, drag across that sound on the waveform and click **Mute sound** or **Cut from video**. Times are in seconds in the original recording.
5. Turn off **Listen to original** and play your edit. Use **Render preview** to hear export noise reduction and see the final composition.
6. Click **Export MP4**, choose a destination outside the project folder, and share that exported file.

A sneeze visible on camera remains visible when you mute it. Use **Cut from video** to remove the picture too.

## What automatic cleanup means

The microphone option requests Chromium noise suppression by default. Additional gentle noise reduction is enabled for microphone export by default. Computer audio recording is **off** by default; turn it on if you want the audio from applications.

The sound model analyzes the first 60 minutes after recording. Strong candidates with low nearby speech scores are checked for muting; uncertain candidates and candidates near speech are left unchecked for review. These thresholds are heuristics, not guarantees. The model can miss sounds, mistake speech for a sound, or flag neighboring words. It does not identify the intended speaker or reliably separate overlapping people. It does not remove sneezes from raw captured files in real time. Review the result before publishing.

Manual mute/cut works for any selected time and for the entire recording. Mute silences a track at that time; it cannot preserve speech overlapping the unwanted sound on the same track. Imported videos usually have one mixed audio track, so voice and background audio cannot be separated there.

The quick editor preview skips cuts and applies mutes. Gentle noise reduction and volume above 100% are heard in **Render preview** and exports. Final text sizing and crop rounding can differ slightly from the quick preview.

## Projects and privacy

Projects are saved under your macOS Movies folder in **ClearTake Projects**, with one subfolder per recording. Each contains original media, normalized playback media and `project.cleartake.json`. **Show project files** reveals the folder. Keep the complete folder to reopen or move a project. Incomplete recordings remain in the list with a recovery link to the files.

Imported videos are copied and converted into a playable H.264 MP4. The source you imported remains unchanged. Exported files contain the enabled edits; project files and raw recordings can still contain unwanted sounds. Share the exported MP4, not the raw project, when those sounds must stay private.

## Publish the source on GitHub

Create an empty repository in your account. From this source folder:

```sh
git init
git add .
git commit -m "Initial independent ClearTake editor"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/ClearTake.git
git push -u origin main
```

The included `.gitignore` excludes dependencies, local models and build output. It does not include your recordings, which live outside this source folder. Keep `LICENSE`, `THIRD-PARTY.md` and the asset provenance note.

To build on GitHub, enable Actions and run **Build ClearTake DMG** manually from the Actions tab. Download its **ClearTake-Apple-Silicon** artifact when successful. The workflow creates a build artifact; it does not publish a release. Your repository must have access to a macOS ARM64 runner. When distributing binaries, also provide the applicable third-party notices and corresponding FFmpeg source/build information described in THIRD-PARTY.md.

## Development and tests

```sh
npm ci
npm start
npm test
python3 tests/sound_test.py
npm run test:window
```

Detection in development requires `.build/venv` and `.build/yamnet`, created by the Mac build script. Recording/manual editing can run without that detector; the UI explains when it is missing. Media tests use the bundled tools, with native source-built/Homebrew fallbacks for development; `TEST_FFMPEG` and `TEST_FFPROBE` can override them. The Mac build script validates the bundled binaries before packaging. FFmpeg 6 and 9 export paths are tested.

`npm test` rebuilds the UI before testing. `npm run test:window` opens an actual Electron window, exercises generated media, subject zoom, project save, and rendered preview, then closes it. It uses isolated temporary preferences/projects and saves a screenshot to `.build/motion-window.png`; it does not load or alter your recordings. A working graphical desktop is required. This does not replace permission/device testing for live screen, microphone, or webcam capture.

The app's main-process entry is `app/main.cjs`. Its isolated UI is under `app/ui`. Editing, export, projects and detection are separate small modules under `engine`.

## First-release boundaries

ClearTake is in development preview. Future work includes multitrack clip rearrangement, clip transitions, continuous cursor-follow panning, cursor-overlay effects, face tracking, speech transcription, speaker isolation, blur/redaction, effects plug-ins and cloud sharing. Subject zoom regions and pointer-dwell suggestions are available today; freeform animation keyframes are not yet supported. Caption import is available; automatic caption generation is planned. Build targets are Apple Silicon Mac and Windows x64; native installation and live recording still need validation on each platform. Verify native permissions, recording sync, long recordings and installation on the target Mac before a public binary release.

Application code: [MIT](LICENSE). Bundled third-party components retain their own licenses.
