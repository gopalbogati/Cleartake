# Third-party components

ClearTake application code is independently written and is licensed under MIT. Renaming an application does not change the licenses of its dependencies. Keep these notices in source distributions and include the collected notices when distributing installers.

| Component | Purpose | License / source |
| --- | --- | --- |
| Electron 43.1.0 | Desktop window and capture APIs | MIT; Chromium and bundled libraries have additional notices. https://github.com/electron/electron |
| ffmpeg-static 5.3.0 | Downloaded FFmpeg executable | GPL-3.0-or-later package; executable terms depend on its build configuration. https://github.com/eugeneware/ffmpeg-static |
| ffprobe-static 3.1.0 | Media inspection executable | MIT wrapper; FFprobe executable is part of FFmpeg and has its own LGPL/GPL build terms. https://github.com/joshwnj/ffprobe-static |
| FFmpeg / FFprobe | Decode, audio filters, compositing and MP4 export | https://ffmpeg.org/legal.html and https://ffmpeg.org/download.html |
| TensorFlow 2.20 | Local sound inference | Apache-2.0. https://github.com/tensorflow/tensorflow |
| TensorFlow Hub 0.16.1 | Load the local model | Apache-2.0. https://github.com/tensorflow/hub |
| tf-keras 2.20 | TensorFlow compatibility | Apache-2.0. https://github.com/keras-team/tf-keras |
| Google YAMNet model v1 | AudioSet sound-event classification | Apache-2.0. https://tfhub.dev/google/yamnet/1 ; model implementation https://github.com/tensorflow/models/tree/master/research/audioset/yamnet |
| NumPy | Audio arrays | BSD-3-Clause. https://numpy.org/about/ |
| PyInstaller | Bundle the local Python helper | GPL with a distribution exception for generated bundles. https://pyinstaller.org/en/stable/license.html |
| @resvg/resvg-js 2.6.2 | Render title/caption images locally | MPL-2.0 wrapper; resvg has its own MIT/Apache components. https://github.com/yisibl/resvg-js |
| esbuild, electron-builder | Development/build tools | MIT. Their own dependencies retain their notices. |

The build copies available license and notice files from installed Electron, media-wrapper and Python packages into the application's `Contents/Resources/ThirdPartyNotices`. Electron also carries Chromium notices. Exact FFmpeg and FFprobe `-version` output and Python versions are collected with those notices. Model assets stay together with the model. Build-time dependencies are pinned through package-lock.json or requirements.txt, except permitted Python compatibility ranges; installed Python versions are recorded in the notices folder.

## Before distributing binary releases

The npm wrapper's license alone is not sufficient for FFmpeg/FFprobe. Review the exact executable configuration in the collected build-version files. GPL-enabled builds require you to satisfy the applicable corresponding-source obligations. Retain the exact upstream executable release, complete corresponding source and build scripts/configuration for what you distribute, and provide them by a license-compliant route with your release. The build does not assemble a corresponding-source archive or assert that a link to an upstream homepage satisfies those obligations. Source-only publication of this app can happen separately from distributing its installers.

Source license copies, the Python runtime notices and model license should accompany your release. For signed public installers, configure your own Apple Developer certificate and notarization credentials outside the repository.

The logo provenance is in `assets/PROVENANCE.md`. No prior app's proprietary branding or interface assets are included in this project.
